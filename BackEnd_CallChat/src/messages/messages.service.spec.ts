import { NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageType } from './schemas/message.schema';

describe('MessagesService', () => {
  const conversationId = '507f1f77bcf86cd799439011';
  const userId = '507f191e810c19729de860ea';
  const messageModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };
  const conversationsService = {
    requireAvailableConversation: jest.fn(),
    touch: jest.fn(),
    markRead: jest.fn(),
  };
  const cloudinaryService = {
    uploadAttachment: jest.fn(),
    deleteAsset: jest.fn(),
  };
  let service: MessagesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new MessagesService(
      messageModel as never,
      conversationsService as never,
      cloudinaryService as never,
    );
  });

  it('creates a text message and updates conversation ordering', async () => {
    const created = { id: 'message-id', content: 'Xin chào' };
    messageModel.create.mockResolvedValue(created);

    await expect(
      service.create(conversationId, userId, { content: 'Xin chào' }),
    ).resolves.toBe(created);
    expect(
      conversationsService.requireAvailableConversation,
    ).toHaveBeenCalledWith(conversationId, userId);
    expect(messageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Xin chào', type: MessageType.TEXT }),
    );
    expect(conversationsService.touch).toHaveBeenCalledWith(conversationId);
  });

  it('returns a chronological page with pagination metadata', async () => {
    const findQuery = {
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      lean: jest.fn(),
      exec: jest
        .fn()
        .mockResolvedValue([{ content: 'Mới' }, { content: 'Cũ' }]),
    };
    findQuery.sort.mockReturnValue(findQuery);
    findQuery.skip.mockReturnValue(findQuery);
    findQuery.limit.mockReturnValue(findQuery);
    findQuery.lean.mockReturnValue(findQuery);
    messageModel.find.mockReturnValue(findQuery);
    messageModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(42),
    });

    await expect(
      service.list(conversationId, userId, { page: 2, limit: 20 }),
    ).resolves.toEqual({
      items: [{ content: 'Cũ' }, { content: 'Mới' }],
      pagination: { page: 2, limit: 20, total: 42, totalPages: 3 },
    });
    expect(findQuery.skip).toHaveBeenCalledWith(20);
    expect(findQuery.limit).toHaveBeenCalledWith(20);
  });

  it('does not read messages when the user is not an available member', async () => {
    conversationsService.requireAvailableConversation.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      service.list(conversationId, userId, { page: 1, limit: 30 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(messageModel.find).not.toHaveBeenCalled();
  });
});
