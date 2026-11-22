import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { encodePhoto, photoDataUrl } from '../../../src/app/employee/photo';

describe('employee photos', () => {
  it('compresses a large image into a valid WebP no larger than 1 MiB', async () => {
    const input = await sharp(randomBytes(1600 * 1600 * 3), {
      raw: { width: 1600, height: 1600, channels: 3 },
    }).png().toBuffer();
    expect(input.length).toBeGreaterThan(1024 * 1024);

    const photo = await encodePhoto(`data:image/png;base64,${input.toString('base64')}`);

    expect(photo.length).toBeLessThanOrEqual(1024 * 1024);
    expect((await sharp(photo).metadata()).format).toBe('webp');
    expect(photoDataUrl(photo)).toBe(`data:image/webp;base64,${photo.toString('base64')}`);
  });

  it('rejects invalid images, mismatched types and inputs over 10 MiB', async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: 'red' },
    }).png().toBuffer();

    await expect(encodePhoto('https://example.com/photo.png')).rejects.toBeInstanceOf(BadRequestException);
    await expect(encodePhoto('data:image/png;base64,abcd!')).rejects.toBeInstanceOf(BadRequestException);
    await expect(encodePhoto(`data:image/jpeg;base64,${png.toString('base64')}`)).rejects.toBeInstanceOf(BadRequestException);
    await expect(encodePhoto(`data:image/png;base64,${Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64')}`))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
