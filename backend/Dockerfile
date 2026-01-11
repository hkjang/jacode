FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @jacode/backend exec prisma generate
RUN pnpm --filter @jacode/backend exec tsc prisma/seed.ts --outDir dist/prisma
RUN pnpm run -r build
RUN pnpm deploy --filter=@jacode/backend --prod /prod/backend

FROM base AS backend
COPY --from=build /prod/backend /prod/backend
COPY --from=build /usr/src/app/backend/dist/prisma /prod/backend/dist/prisma
COPY --from=build /usr/src/app/backend/prisma /prod/backend/prisma
WORKDIR /prod/backend
EXPOSE 3000
CMD [ "node", "dist/main" ]
