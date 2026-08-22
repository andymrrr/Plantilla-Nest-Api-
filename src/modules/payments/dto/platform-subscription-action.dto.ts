import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlatformSubscriptionActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
