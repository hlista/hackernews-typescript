import { objectType } from "nexus";

export const User = objectType({
  name: "User",
  definition(t) {
    t.nonNull.int("id");
    t.nonNull.string("name");
    t.nonNull.string("email");
    t.list.field("links", {
      type: "Link",
      resolve(parent, args, context) {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id}
          }).links();
      }
    });
    t.list.field("votes", {
      type: "Link",
      resolve(parent, args, context) {
        const { id } = parent;
        const votes = context.prisma.user.findUnique({ where: { id: id } }).votes();
        return votes;
      }
  });
  }
})