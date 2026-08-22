import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PlatformSubscriptionCheckoutDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  planCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelUrl?: string;
}
