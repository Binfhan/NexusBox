import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@Body() body: { name: string; parent_id?: string }, @Req() req: any) {
    return this.foldersService.create(req.user.wallet_address, body.name, body.parent_id);
  }

  @Get()
  findAll(@Query('parent_id') parentId: string | undefined, @Req() req: any) {
    return this.foldersService.findAll(req.user.wallet_address, parentId || undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.foldersService.findOne(id, req.user.wallet_address);
  }

  @Get(':id/breadcrumb')
  getBreadcrumb(@Param('id') id: string, @Req() req: any) {
    return this.foldersService.getBreadcrumb(id, req.user.wallet_address);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name: string }, @Req() req: any) {
    return this.foldersService.update(id, req.user.wallet_address, body.name);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() body: { parent_id?: string }, @Req() req: any) {
    return this.foldersService.move(id, req.user.wallet_address, body.parent_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.foldersService.remove(id, req.user.wallet_address);
  }

  @Delete(':id/recursive')
  removeRecursive(@Param('id') id: string, @Req() req: any) {
    return this.foldersService.removeRecursive(id, req.user.wallet_address);
  }
}
