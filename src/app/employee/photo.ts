import { BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

const MAX_PHOTO_BYTES = 1024 * 1024;
const MAX_INPUT_BYTES = 10 * MAX_PHOTO_BYTES;
const logger = new Logger('EmployeePhoto');

export async function encodePhoto(dataUrl: string): Promise<Buffer> {
  const match = /^data:image\/(jpeg|png|webp);base64,/.exec(dataUrl);
  if (!match) {
    throw new BadRequestException('Photo must be a JPEG, PNG or WebP data URL of at most 10 MiB');
  }

  const encoded = dataUrl.slice(match[0].length);
  if (!encoded || encoded.length > Math.ceil(MAX_INPUT_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new BadRequestException('Photo must be a valid image of at most 10 MiB');
  }
  const input = Buffer.from(encoded, 'base64');
  if (input.length > MAX_INPUT_BYTES || input.toString('base64') !== encoded) {
    throw new BadRequestException('Photo must be a valid image of at most 10 MiB');
  }

  try {
    const metadata = await sharp(input, { animated: false }).metadata();
    if (metadata.format !== match[1]) {
      throw new BadRequestException('Photo content does not match its image type');
    }

    for (let size = 2048; size >= 128; size /= 2) {
      for (const quality of [80, 60, 40]) {
        const output = await sharp(input, { animated: false })
          .rotate()
          .resize(size, size, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        if (output.length <= MAX_PHOTO_BYTES) {
          return output;
        }
      }
    }
    throw new BadRequestException('Photo could not be compressed to 1 MiB');
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    logger.warn('Failed to process employee photo', error instanceof Error ? error.message : String(error));
    throw new BadRequestException('Photo is not a valid or supported image');
  }
}

export function photoDataUrl(photo: Buffer | null): string | null {
  return photo === null ? null : `data:image/webp;base64,${photo.toString('base64')}`;
}
