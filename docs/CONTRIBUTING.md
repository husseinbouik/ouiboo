# Contributing Guidelines

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/ouiboo.git`
3. Add upstream: `git remote add upstream https://github.com/husseinbouik/ouiboo.git`
4. Create feature branch: `git checkout -b feature/your-feature`
5. Install dependencies: `npm install`
6. Start development: `npm run dev`

## Commit Conventions

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `ci`: CI/CD changes
- `chore`: Build/tooling changes

### Examples

```
feat(payments): add CMI payment gateway integration

Implement CMI payment provider with webhook support

Closes #123
```

```
fix(reviews): prevent duplicate reviews per booking

Add unique constraint on booking ID in Review model

Fixes #456
```

## Code Style

### TypeScript

- Use strict mode
- Type all function parameters and returns
- Avoid `any` type (use `unknown` if needed)
- Use interfaces for object types
- Use enums for fixed sets of values

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### NestJS

- Use dependency injection
- Implement interfaces
- Use DTOs for input validation
- Follow module structure

```typescript
// Good
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// In controller
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }
}
```

### Next.js

- Use functional components and hooks
- Use TypeScript for type safety
- Implement proper error boundaries
- Use ESLint/Prettier configuration

```typescript
// Good
interface Props {
  userId: string;
}

export default function UserProfile({ userId }: Props) {
  const { data, isLoading } = useFetch(`/users/${userId}`);

  if (isLoading) return <Skeleton />;

  return <div>{data.name}</div>;
}
```

## Testing

### Unit Tests

Write tests for business logic:

```typescript
describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReviewsService, PrismaService],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should create a review', async () => {
    const review = await service.createReview('bookingId', 'userId', {
      rating: 5,
      comment: 'Great trip!',
    });

    expect(review.rating).toBe(5);
  });
});
```

### Integration Tests

Test API endpoints:

```typescript
describe('Reviews API', () => {
  it('POST /bookings/:id/review should create review', async () => {
    const res = await request(app.getHttpServer())
      .post('/bookings/123/review')
      .send({ rating: 5, comment: 'Great!' })
      .expect(201);

    expect(res.body.rating).toBe(5);
  });
});
```

### E2E Tests

Test user flows:

```typescript
describe('Review Flow', () => {
  it('should allow traveler to review completed booking', () => {
    cy.login('traveler@example.com');
    cy.visit('/bookings');
    cy.contains('Review').click();
    cy.get('[data-testid="rating"]').click();
    cy.get('[data-testid="submit"]').click();
    cy.contains('Review submitted').should('be.visible');
  });
});
```

## Pull Request Process

1. **Create PR**: Push branch and create PR against `develop`
2. **Title Format**: `[Feature] Description` or `[Fix] Description`
3. **Description**: Include what changed and why
4. **Tests**: Add tests for new functionality
5. **Documentation**: Update docs if needed
6. **CI/CD**: Wait for checks to pass
7. **Review**: Request review from maintainers
8. **Merge**: Squash and merge to develop

### PR Template

```markdown
## Description
Briefly describe the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Related Issues
Closes #123

## Testing
Describe tests added or updated.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors
- [ ] Follows style guide
- [ ] No breaking changes documented
```

## Database Changes

When modifying the database schema:

1. Create a migration: `npx prisma migrate dev --name description`
2. Test the migration locally
3. Commit migration files to git
4. Document schema changes in PR

```bash
# Good workflow
npx prisma migrate dev --name add_review_model
# ... test ...
git add prisma/migrations/
git commit -m "feat(database): add Review model"
```

## Documentation

- Update README.md for user-facing changes
- Add inline comments for complex logic
- Update API documentation for endpoint changes
- Add architecture decision records (ADRs) for major decisions

## Performance Considerations

- Avoid N+1 queries (use Prisma's `include`)
- Add database indexes for frequently queried fields
- Implement caching for expensive operations
- Paginate large result sets
- Monitor bundle size impacts

```typescript
// Good - avoid N+1
const bookings = await prisma.booking.findMany({
  include: { traveler: true, session: true },
});

// Avoid - causes N+1 queries
const bookings = await prisma.booking.findMany();
for (const booking of bookings) {
  const traveler = await prisma.user.findUnique({
    where: { id: booking.travelerId },
  });
}
```

## Security Practices

- Validate all user inputs
- Sanitize data before displaying
- Use parameterized queries (Prisma handles this)
- Implement proper error handling (don't leak sensitive info)
- Use HTTPS/TLS for external communication
- Store secrets in environment variables
- Hash passwords with bcrypt

```typescript
// Good
@Post('login')
async login(@Body() dto: LoginDto) {
  const user = await this.authService.validateUser(dto.email, dto.password);
  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }
  return this.authService.login(user);
}

// Avoid - leaks too much info
if (!user) {
  throw new Error('User not found');
}
```

## Review Process

- Code review by at least 1 maintainer
- CI/CD checks must pass
- No merge conflicts
- Comments addressed
- Tests included for bug fixes
- Documentation updated

## Release Process

1. Merge to `develop`
2. Create release branch: `git checkout -b release/v1.0.0`
3. Bump version: Update `package.json` versions
4. Update CHANGELOG.md
5. Create PR and merge to `master`
6. Tag release: `git tag -a v1.0.0 -m "Release v1.0.0"`
7. Push tag: `git push origin v1.0.0`

## Questions & Support

- Check existing issues and discussions
- Ask in GitHub discussions
- Reach out to maintainers
- Check documentation

Thank you for contributing!
