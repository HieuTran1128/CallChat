import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ContactsService } from './contacts.service';
import { Contact, ContactStatus } from './schemas/contact.schema';

describe('ContactsService', () => {
  let service: ContactsService;
  const contactModel = { findById: jest.fn(), findOne: jest.fn() };
  const usersService = { getProfile: jest.fn() };
  const firstId = new Types.ObjectId().toString();
  const secondId = new Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getModelToken(Contact.name), useValue: contactModel },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    service = module.get(ContactsService);
  });

  it('không cho gửi lời mời tới chính mình', async () => {
    await expect(service.sendRequest(firstId, firstId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(usersService.getProfile).not.toHaveBeenCalled();
  });

  it('không cho người gửi tự chấp nhận lời mời', async () => {
    contactModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        status: ContactStatus.PENDING,
        requestedBy: new Types.ObjectId(firstId),
        participants: [
          new Types.ObjectId(firstId),
          new Types.ObjectId(secondId),
        ],
      }),
    });
    await expect(
      service.acceptRequest(new Types.ObjectId().toString(), firstId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('không cho gửi lời mời ngược khi cặp user đang chờ xử lý', async () => {
    usersService.getProfile.mockResolvedValue({ isActive: true });
    contactModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ status: ContactStatus.PENDING }),
    });
    await expect(service.sendRequest(secondId, firstId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('chỉ người đã chặn mới có thể bỏ chặn', async () => {
    contactModel.findOne.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ blockedBy: new Types.ObjectId(firstId) }),
    });
    await expect(service.unblock(secondId, firstId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
