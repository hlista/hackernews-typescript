import { extendType, nonNull, objectType, stringArg, idArg, intArg, inputObjectType, enumType, arg, list } from "nexus";
import { Prisma } from "@prisma/client"

export const Link = objectType({
    name: "Link", // 1 
    definition(t) {  // 2
        t.nonNull.int("id"); // 3 
        t.nonNull.string("description"); // 4
        t.nonNull.string("url"); // 5 
        t.nonNull.dateTime("createdAt");
        t.field("postedBy", {
          type: "User",
          resolve(parent, args, context) {
            return context.prisma.link
              .findUnique({
                where: { id: parent.id }
              }).postedBy();
          }
        });
        t.list.field("voters", {
          type: "User",
          resolve(parent, args, context) {
            const { id } = parent;
            const voters = context.prisma.link.findUnique({ where: {id: id}}).voters();
            return voters;
          }
        });
    },
});

export const Feed = objectType({
  name: "Feed",
  definition(t) {
    t.nonNull.list.nonNull.field("links", { type: Link });
    t.nonNull.int("count");
    t.id("id")
  }
})

export const LinkOrderByInput = inputObjectType({
  name: "LinkOrderByInput",
  definition(t) {
    t.field("description", {type: Sort});
    t.field("url", {type: Sort});
    t.field("createdAt", {type: Sort});
  }
})

export const Sort = enumType({
  name: "Sort",
  members: ["asc", "desc"]
})

export const LinkQuery = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.field("feed", {
      type: "Feed",
      args: {
        filter: stringArg(),
        skip: intArg(),
        take: intArg(),
        orderBy: arg({
          type: list(nonNull(LinkOrderByInput))
        })
      },
      async resolve(parent, args, context) {
        const where = args.filter
          ? {
            OR: [
              { description: {contains: args.filter}},
              { url: {contains: args.filter}}
            ]
          } : {};
        const links = context.prisma.link.findMany({
          where,
          skip: args?.skip as number | undefined,
          take: args?.take as number | undefined,
          orderBy: args?.orderBy as
            | Prisma.Enumerable<Prisma.LinkOrderByWithRelationInput>
            | undefined,
        });

        const count = await context.prisma.link.count({ where });
        const id = `main-feed:${JSON.stringify(args)}`;
        console.log({
          links,
          count,
          id
        })
        return {
          links,
          count,
          id
        }
      }
    });

    t.field("link", {
      type: "Link",
      args: {
        id: nonNull(idArg())
      },

      resolve(parent, args, context, info) {
        const { id } = args;
        return context.prisma.link.findUnique({
          where: {
            id: parseInt(id),
          }
        });
      }
    })
  }
})

export const LinkMutation = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("post", {
      type: "Link",
      args: {
        description: nonNull(stringArg()),
        url: nonNull(stringArg())
      },

      resolve(parent, args, context) {
        const { description, url } = args;
        const { userId } = context;

        if (!userId) {
          throw new Error("Cannot post without logging in.");
        }

        const newLink = context.prisma.link.create({
          data: {
            description,
            url,
            postedBy: {
              connect: {
                id: userId
              }
            }
          }
        });
        return newLink;
      }
    })

    t.nonNull.field("deleteLink", {
      type: "Link",
      args: {
        id: nonNull(idArg())
      },
      resolve(parent, args, context, info) {
        const { id } = args;
        const { userId } = context;

        if (!userId) {
          throw new Error("Cannot delete without logging in.")
        }
        let deletedLink = context.prisma.link.delete({
          where: {
            id: parseInt(id),
            postedById: userId
          }
        })
        
        if (!deletedLink) {
          throw new Error("Link does not exist.")
        }

        return deletedLink
      }
    })

    t.nonNull.field("updateLink", {
      type: "Link",
      args: {
        id: nonNull(idArg()),
        description: stringArg(),
        url: stringArg()
      },
      resolve(parent, args, context) {
        const { id, description, url } = args;
        const {userId} = context

        if (!userId) {
          throw new Error("Cannot update Link without logging in.");
        }
        let data = new Map()
        if (description) {
          data.set("description", description);
        }
        if (url){
          data.set("url", url);
        }
        
        let updatedLink = context.prisma.link.update({
          where: {
            id: parseInt(id),
            postedById: userId
          },
          data: Object.fromEntries(data)
        });

        if (!updatedLink) {
          throw new Error("Link does not exist.");
        }

        return updatedLink;
      }
    })
  }
})