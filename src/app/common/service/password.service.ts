import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
    return `scrypt$${salt}$${key.toString('hex')}`;
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, expectedHex] = passwordHash.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex || !/^[0-9a-f]{128}$/i.test(expectedHex)) {
      return false;
    }

    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(actual, expected);
  }
}
