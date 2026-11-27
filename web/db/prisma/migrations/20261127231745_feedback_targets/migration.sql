-- Feedback targets: reactions and comments attach to a shared
-- `feedback_targets` row instead of directly to posts, so they work on any
-- type (posts, comments — enabling comment reactions and replies — and later
-- photos, polls, …). See the "Feedback targets" section of schema.prisma.
--
-- Hand-written so existing data is kept: every post and comment gets a
-- target, post counts move onto targets, post_reactions move to reactions,
-- and comments point at their post's target.

-- ─── 1. Remove the old count triggers (they reference columns dropped below)

DROP TRIGGER post_reactions_sync_count ON post_reactions;
DROP TRIGGER comments_sync_count ON comments;
DROP FUNCTION posts_sync_reaction_count();
DROP FUNCTION posts_sync_comment_count();

-- ─── 2. New tables

CREATE TYPE "feedback_target_type" AS ENUM ('POST', 'COMMENT');

CREATE TABLE "feedback_targets" (
    "id" BIGINT NOT NULL DEFAULT next_id(),
    "target_type" "feedback_target_type" NOT NULL,
    "circle_id" BIGINT NOT NULL,
    "reaction_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reactions" (
    "target_id" BIGINT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "reaction_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("target_id","user_id")
);

-- ─── 3. Backfill: a target for every post, keeping its counts

ALTER TABLE "posts" ADD COLUMN "target_id" BIGINT;
UPDATE "posts" SET "target_id" = next_id();
INSERT INTO "feedback_targets" ("id", "target_type", "circle_id", "reaction_count", "comment_count", "created_at")
SELECT "target_id", 'POST', "circle_id", "reaction_count", "comment_count", "created_at" FROM "posts";

-- ─── 4. Backfill: post reactions → reactions on the post's target

INSERT INTO "reactions" ("target_id", "user_id", "type", "created_at", "updated_at")
SELECT p."target_id", r."user_id", r."type", r."created_at", r."updated_at"
FROM "post_reactions" r JOIN "posts" p ON p."id" = r."post_id";

-- ─── 5. Backfill: comments get their own target and point at their post's

ALTER TABLE "comments" ADD COLUMN "target_id" BIGINT, ADD COLUMN "parent_target_id" BIGINT;
UPDATE "comments" c SET "target_id" = next_id(), "parent_target_id" = p."target_id"
FROM "posts" p WHERE p."id" = c."post_id";
INSERT INTO "feedback_targets" ("id", "target_type", "circle_id", "created_at")
SELECT c."target_id", 'COMMENT', p."circle_id", c."created_at"
FROM "comments" c JOIN "posts" p ON p."id" = c."post_id";

-- ─── 6. Drop what moved, tighten the new columns

ALTER TABLE "comments" DROP CONSTRAINT "comments_post_id_fkey";
DROP INDEX "comments_post_id_id_idx";
ALTER TABLE "comments" DROP COLUMN "post_id",
    ALTER COLUMN "target_id" SET NOT NULL,
    ALTER COLUMN "parent_target_id" SET NOT NULL;

ALTER TABLE "posts" DROP COLUMN "comment_count",
    DROP COLUMN "reaction_count",
    ALTER COLUMN "target_id" SET NOT NULL;

DROP TABLE "post_reactions";

-- ─── 7. Indexes and foreign keys (as Prisma generates them)

CREATE INDEX "reactions_user_id_idx" ON "reactions"("user_id");
CREATE UNIQUE INDEX "comments_target_id_key" ON "comments"("target_id");
CREATE INDEX "comments_parent_target_id_id_idx" ON "comments"("parent_target_id", "id");
CREATE UNIQUE INDEX "posts_target_id_key" ON "posts"("target_id");

ALTER TABLE "feedback_targets" ADD CONSTRAINT "feedback_targets_circle_id_fkey" FOREIGN KEY ("circle_id") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "feedback_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "feedback_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "feedback_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_target_id_fkey" FOREIGN KEY ("parent_target_id") REFERENCES "feedback_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 8. Triggers (created after the backfill so copied rows aren't counted twice)

-- Counts: feedback_targets.reaction_count / comment_count stay in sync for
-- every writer. Changing a reaction's type is an UPDATE and doesn't change
-- the total. When a target is being deleted, these UPDATEs match no row.

CREATE FUNCTION feedback_targets_sync_reaction_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback_targets SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
  ELSE
    UPDATE feedback_targets SET reaction_count = reaction_count - 1 WHERE id = OLD.target_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER reactions_sync_count
AFTER INSERT OR DELETE ON reactions
FOR EACH ROW EXECUTE FUNCTION feedback_targets_sync_reaction_count();

CREATE FUNCTION feedback_targets_sync_comment_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback_targets SET comment_count = comment_count + 1 WHERE id = NEW.parent_target_id;
  ELSE
    UPDATE feedback_targets SET comment_count = comment_count - 1 WHERE id = OLD.parent_target_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER comments_sync_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION feedback_targets_sync_comment_count();

-- Cleanup: deleting an owner (post, comment, …) deletes its target, which
-- cascades to the target's reactions and the comments left on it. Shared by
-- every owning table — attach it to each new one.

CREATE FUNCTION feedback_targets_delete_owned() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM feedback_targets WHERE id = OLD.target_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER posts_delete_target
AFTER DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION feedback_targets_delete_owned();

CREATE TRIGGER comments_delete_target
AFTER DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION feedback_targets_delete_owned();
