import { IsOptional, IsString, IsBoolean, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  twitter_url?: string;

  @IsOptional()
  @IsString()
  github_url?: string;

  @IsOptional()
  @IsString()
  website_url?: string;

  @IsOptional()
  @IsBoolean()
  is_profile_public?: boolean;
}

export class UploadAvatarDto {
  @IsString()
  avatar_url!: string;
}
