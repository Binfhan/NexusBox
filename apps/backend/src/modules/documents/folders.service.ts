import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { Document } from './entities/document.entity';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private folderRepository: Repository<Folder>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async create(walletAddress: string, name: string, parentId?: string) {
    if (parentId) {
      const parent = await this.folderRepository.findOne({ where: { id: parentId, owner_wallet: walletAddress.toLowerCase() } });
      if (!parent) throw new NotFoundException('Parent folder not found');
    }
    return this.folderRepository.save({
      name,
      parent_id: parentId || undefined,
      owner_wallet: walletAddress.toLowerCase(),
    } as any);
  }

  async findAll(walletAddress: string, parentId?: string) {
    const where: any = { owner_wallet: walletAddress.toLowerCase() };
    where.parent_id = parentId || IsNull();
    return this.folderRepository.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: string, walletAddress: string) {
    const folder = await this.folderRepository.findOne({
      where: { id, owner_wallet: walletAddress.toLowerCase() },
      relations: ['parent'],
    });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async update(id: string, walletAddress: string, name: string) {
    const folder = await this.findOne(id, walletAddress);
    folder.name = name;
    return this.folderRepository.save(folder);
  }

  async move(id: string, walletAddress: string, parentId?: string) {
    const folder = await this.findOne(id, walletAddress);
    if (parentId) {
      const parent = await this.folderRepository.findOne({ where: { id: parentId, owner_wallet: walletAddress.toLowerCase() } });
      if (!parent) throw new NotFoundException('Target folder not found');
      if (parentId === id) throw new BadRequestException('Cannot move folder into itself');
    }
    folder.parent_id = parentId || undefined as any;
    return this.folderRepository.save(folder);
  }

  async remove(id: string, walletAddress: string) {
    const folder = await this.findOne(id, walletAddress);
    const childFolders = await this.folderRepository.count({ where: { parent_id: id, owner_wallet: walletAddress.toLowerCase() } });
    const childDocs = await this.documentRepository.count({ where: { parent_folder_id: id, wallet_address: walletAddress.toLowerCase(), deleted_at: IsNull() } });
    if (childFolders > 0 || childDocs > 0) {
      throw new BadRequestException('Folder is not empty. Delete contents first.');
    }
    return this.folderRepository.remove(folder);
  }

  async removeRecursive(id: string, walletAddress: string) {
    await this.findOne(id, walletAddress);
    await this.deleteFolderTree(id, walletAddress.toLowerCase());
    return { success: true };
  }

  private async deleteFolderTree(folderId: string, walletAddress: string) {
    const children = await this.folderRepository.find({ where: { parent_id: folderId, owner_wallet: walletAddress } });
    for (const child of children) {
      await this.deleteFolderTree(child.id, walletAddress);
    }
    await this.documentRepository.update(
      { parent_folder_id: folderId, wallet_address: walletAddress },
      { deleted_at: new Date() as any },
    );
    await this.folderRepository.delete({ id: folderId, owner_wallet: walletAddress });
  }

  async getBreadcrumb(id: string, walletAddress: string): Promise<Folder[]> {
    const breadcrumb: Folder[] = [];
    let current = await this.folderRepository.findOne({ where: { id, owner_wallet: walletAddress.toLowerCase() }, relations: ['parent'] });
    while (current) {
      breadcrumb.unshift(current);
      current = current.parent_id ? await this.folderRepository.findOne({ where: { id: current.parent_id, owner_wallet: walletAddress.toLowerCase() }, relations: ['parent'] }) : null;
    }
    return breadcrumb;
  }
}
