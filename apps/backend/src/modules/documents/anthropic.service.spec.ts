import { Test, TestingModule } from '@nestjs/testing';
import { AnthropicService } from './anthropic.service';

describe('AnthropicService', () => {
  let service: AnthropicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnthropicService],
    }).compile();

    service = module.get<AnthropicService>(AnthropicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
