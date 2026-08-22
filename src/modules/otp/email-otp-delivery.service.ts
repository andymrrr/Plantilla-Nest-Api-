import { Injectable } from '@nestjs/common';
import { TransactionalMailService } from '../mail/transactional-mail.service';

@Injectable()
export class EmailOtpDeliveryService {
  constructor(private readonly transactionalMail: TransactionalMailService) {}

  async sendLoginTwoFactorCode(
    to: string,
    code: string,
    expiresMinutes: number,
  ): Promise<void> {
    await this.transactionalMail.sendLoginTwoFactorCode(to, {
      code,
      expiresMinutes,
    });
  }
}
