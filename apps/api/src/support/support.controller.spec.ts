import 'reflect-metadata';
import { UserRole } from '@ouiboo/types';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('Support controllers (#446)', () => {
  it('the public controller delegates ticket creation to the service', async () => {
    const service: any = {
      createTicket: jest.fn(async (dto: unknown) => ({ id: 'ticket-1', status: 'OPEN', dto })),
    };
    const controller = new SupportController(service);
    const dto = {
      requesterName: 'Amine',
      requesterEmail: 'amine@example.com',
      subject: 'Help',
      message: 'I need help with my booking please.',
    };
    await expect(controller.create(dto as never)).resolves.toMatchObject({ id: 'ticket-1', status: 'OPEN' });
    expect(service.createTicket).toHaveBeenCalledWith(dto);
  });

  it('the admin controller lists with filters and updates with the JWT actor id', async () => {
    const service: any = {
      listTickets: jest.fn(async () => []),
      updateTicket: jest.fn(async (id: string) => ({ id, status: 'RESOLVED' })),
    };
    const controller = new AdminSupportController(service);

    await controller.list('OPEN', 'BOOKING');
    expect(service.listTickets).toHaveBeenCalledWith('OPEN', 'BOOKING');

    const req: any = { user: { id: 'admin-9' } };
    await expect(controller.update('ticket-1', { status: 'RESOLVED' }, req)).resolves.toMatchObject({ status: 'RESOLVED' });
    expect(service.updateTicket).toHaveBeenCalledWith('ticket-1', { status: 'RESOLVED' }, 'admin-9');

    // sub fallback when id is absent
    const reqSub: any = { user: { sub: 'admin-10' } };
    await controller.update('ticket-1', { status: 'RESOLVED' }, reqSub);
    expect(service.updateTicket).toHaveBeenLastCalledWith('ticket-1', { status: 'RESOLVED' }, 'admin-10');
  });

  it('the admin controller is gated to the admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminSupportController)).toEqual([UserRole.Admin]);
  });
});
