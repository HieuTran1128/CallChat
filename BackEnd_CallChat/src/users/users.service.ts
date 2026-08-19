import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  findForLogin(identifier: string): Promise<UserDocument | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    return this.userModel
      .findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      })
      .select('+passwordHash')
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  create(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<UserDocument> {
    return this.userModel.create({
      ...data,
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      displayName: data.displayName.trim(),
    });
  }
}
