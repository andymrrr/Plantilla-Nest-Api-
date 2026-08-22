import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { TransactionalMailService } from './transactional-mail.service';

@Module({
  imports: [ConfigModule],
  providers: [MailService, TransactionalMailService],
  exports: [MailService, TransactionalMailService],
})
export class MailModule {}
