// Prisma 7 CLI configuration: the datasource URL lives here (not in
// schema.prisma) so migrate/studio read it from .env at runtime.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
