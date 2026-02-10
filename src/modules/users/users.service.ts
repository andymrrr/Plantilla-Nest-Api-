import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import * as bcrypt from 'bcrypt';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { buildTypeOrmPaginationArgs } from '../../common/utils/pagination';
import { createPaginationResult } from '../../common/types/pagination.types';
import type { PaginationResult } from '../../common/types/pagination.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    roleId: number,
  ): Promise<User> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async paginate(query: UserListQueryDto): Promise<PaginationResult<User>> {
    const args = buildTypeOrmPaginationArgs<User>(query, {
      searchableFields: ['email', 'firstName', 'lastName'],
      defaultOrderBy: 'createdAt',
    });
    const [items, total] = await this.userRepository.findAndCount({
      where: args.where,
      skip: args.skip,
      take: args.take,
      order: args.order as { [key: string]: 'ASC' | 'DESC' },
    });
    return createPaginationResult(items, args.page, args.limit, total);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
