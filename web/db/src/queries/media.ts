import { prisma } from '../client'

export async function createPhotoMedia({
  uploaderId,
  storageKey,
  mimeType,
  width,
  height,
  sizeBytes,
}: {
  uploaderId: string
  storageKey: string
  mimeType: string
  width: number
  height: number
  sizeBytes: number
}) {
  return prisma.media.create({
    data: {
      uploaderId,
      kind: 'PHOTO',
      storageKey,
      mimeType,
      width,
      height,
      sizeBytes,
    },
    select: { id: true, storageKey: true, width: true, height: true },
  })
}
