import { ForbiddenException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

describe('ConversationsService', () => {
  const firstId = '507f1f77bcf86cd799439011';
  const secondId = '507f191e810c19729de860ea';
  const contactsService = {
    assertCanChat: jest.fn(),
    listFriendIds: jest.fn(),
  };
  const conversationModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };
  const messageModel = { countDocuments: jest.fn() };
  let service: ConversationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationsService(
      conversationModel as never,
      contactsService as never,
      messageModel as never,
    );
  });

  it('returns an existing direct conversation', async () => {
    const populated = { id: 'conversation-id' };
    const existing = { populate: jest.fn().mockResolvedValue(populated) };
    conversationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existing),
    });

    await expect(service.getOrCreateDirect(firstId, secondId)).resolves.toBe(
      populated,
    );
    expect(contactsService.assertCanChat).toHaveBeenCalledWith(
      firstId,
      secondId,
    );
    expect(conversationModel.create).not.toHaveBeenCalled();
  });

  it('does not create a conversation when users cannot chat', async () => {
    contactsService.assertCanChat.mockRejectedValue(
      new ForbiddenException('Chỉ có thể trò chuyện với bạn bè'),
    );

    await expect(
      service.getOrCreateDirect(firstId, secondId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(conversationModel.findOne).not.toHaveBeenCalled();
    expect(conversationModel.create).not.toHaveBeenCalled();
  });

  it('returns no conversations when the user has no friends', async () => {
    contactsService.listFriendIds.mockResolvedValue([]);

    await expect(service.list(firstId)).resolves.toEqual([]);
    expect(conversationModel.find).not.toHaveBeenCalled();
  });
});
