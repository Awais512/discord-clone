# 🎮 Real-time Chat & Communication Platform

A feature-rich Discord-like platform with real-time messaging, voice/video calls, and comprehensive server management.

![Next JS](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)

## ✨ Key Features

### 💬 Real-time Communication
- **Messaging System**
  - Real-time updates with Socket.io
  - Edit & delete messages
  - File attachments via UploadThing
  - Infinite message loading
  - Message batching

- **Channels**
  - Text channels
  - Audio calls
  - Video calls
  - Custom channel permissions

- **Direct Communication**
  - 1:1 messaging
  - Private video calls
  - Private audio calls
  - Real-time status updates

### 🛡️ Server Management
- **Member Controls**
  - Role management (Guest/Moderator)
  - Member kicks
  - Invite system
  - Permissions management

- **Server Features**
  - Server customization
  - Invite link generation
  - Channel management
  - Server analytics

### 🎨 User Experience
- **Modern UI/UX**
  - TailwindCSS styling
  - Shadcn UI components
  - Full responsiveness
  - Mobile-first design
  - Light/Dark mode

## 🛠️ Tech Stack

```typescript
const techStack = {
  frontend: {
    framework: "Next.js",
    realtime: "Socket.io-client",
    styling: ["TailwindCSS", "Shadcn UI"],
    stateManagement: "@tanstack/query",
  },
  backend: {
    realtime: "Socket.io",
    database: "MySQL (Planetscale)",
    orm: "Prisma",
    auth: "Clerk",
    uploads: "UploadThing"
  },
  deployment: {
    database: "Planetscale",
    websockets: "Custom Socket.io server",
    hosting: "Vercel"
  }
};
```

## 💎 Core Features Implementation

### 🔌 Socket.io Setup

```typescript
// socket/index.ts
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';

export function initializeSocket(server: NetServer) {
  const io = new SocketIOServer(server, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-server', (serverId: string) => {
      socket.join(`server-${serverId}`);
    });

    socket.on('send-message', (message) => {
      io.to(`server-${message.serverId}`)
        .emit('new-message', message);
    });

    socket.on('edit-message', (message) => {
      io.to(`server-${message.serverId}`)
        .emit('message-update', message);
    });
  });

  return io;
}
```

### 💬 Real-time Messaging

```typescript
// hooks/useChat.ts
export function useChat(channelId: string) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: messages, fetchNextPage } = useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam = 1 }) => 
      fetchMessages(channelId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const sendMessage = async (content: string, attachments?: File[]) => {
    const uploadedFiles = attachments?.length 
      ? await uploadFiles(attachments)
      : [];

    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        attachments: {
          create: uploadedFiles
        }
      }
    });

    socket.emit('send-message', message);
    queryClient.setQueryData(['messages', channelId], 
      (old: any) => ({
        ...old,
        pages: [
          { messages: [message], ...old.pages[0] },
          ...old.pages.slice(1)
        ]
      })
    );
  };

  return {
    messages,
    sendMessage,
    fetchNextPage
  };
}
```

### 🎥 Video Calls

```typescript
// components/calls/VideoCall.tsx
export function VideoCall({ channelId }: { channelId: string }) {
  const [localStream, setLocalStream] = useState<MediaStream>();
  const [remoteStream, setRemoteStream] = useState<MediaStream>();
  const peerConnection = useRef<RTCPeerConnection>();

  useEffect(() => {
    const initializeCall = async () => {
      const stream = await navigator.mediaDevices
        .getUserMedia({ video: true, audio: true });
      
      setLocalStream(stream);
      
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };
    };

    initializeCall();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      <video 
        ref={video => {
          if (video) video.srcObject = localStream;
        }}
        autoPlay 
        muted 
      />
      <video
        ref={video => {
          if (video) video.srcObject = remoteStream;
        }}
        autoPlay
      />
    </div>
  );
}
```

### 🔗 Invite System

```typescript
// lib/invites.ts
export async function generateInviteLink(serverId: string) {
  const invite = await prisma.invite.create({
    data: {
      serverId,
      code: generateUniqueCode(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  return `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${invite.code}`;
}

export async function joinServer(inviteCode: string, userId: string) {
  const invite = await prisma.invite.findUnique({
    where: { code: inviteCode },
    include: { server: true }
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw new Error('Invalid or expired invite');
  }

  return await prisma.serverMember.create({
    data: {
      serverId: invite.serverId,
      userId,
      role: 'GUEST'
    }
  });
}
```

### 📁 File Uploads

```typescript
// lib/uploadthing.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  messageAttachment: f({
    image: { maxFileSize: "4MB" },
    video: { maxFileSize: "16MB" },
    audio: { maxFileSize: "8MB" },
    pdf: { maxFileSize: "8MB" }
  })
    .middleware(async ({ req }) => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    })
} satisfies FileRouter;
```

## 📊 Database Schema

```prisma
model Profile {
  id       String    @id @default(uuid())
  userId   String    @unique
  name     String
  imageUrl String    @db.Text
  email    String    @db.Text
  server   Server[]
  members  Member[]
  channels Channel[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Server {
  id         String @id @default(uuid())
  name       String
  imageUrl   String @db.Text
  inviteCode String @unique

  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  members  Member[]
  channels Channel[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([profileId])
}

enum MemberRole {
  ADMIN
  MODERATOR
  GUEST
}

model Member {
  id   String     @id @default(uuid())
  role MemberRole @default(GUEST)

  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  serverId String
  server   Server @relation(fields: [serverId], references: [id], onDelete: Cascade)

  messages Message[]

  conversationsInitiated Conversation[] @relation("MemberOne")
  conversationsReceived  Conversation[] @relation("MemberTwo")

  directMessages DirectMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([profileId])
  @@index([serverId])
}

enum ChannelType {
  TEXT
  AUDIO
  VIDEO
}

model Channel {
  id   String      @id @default(uuid())
  name String
  type ChannelType @default(TEXT)

  profileId String
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  serverId String
  server   Server @relation(fields: [serverId], references: [id], onDelete: Cascade)

  messages Message[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([profileId])
  @@index([serverId])
}

model Message {
  id      String  @id @default(uuid())
  content String  @db.Text
  fileUrl String? @db.Text

  memberId String
  member   Member @relation(fields: [memberId], references: [id], onDelete: Cascade)

  channelId String
  channel   Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  deleted Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([channelId])
  @@index([memberId])
}

model Conversation {
  id String @id @default(uuid())

  memberOneId String
  memberOne   Member @relation("MemberOne", fields: [memberOneId], references: [id], onDelete: Cascade)

  memberTwoId String
  memberTwo   Member @relation("MemberTwo", fields: [memberTwoId], references: [id], onDelete: Cascade)

  directMessages DirectMessage[]

  @@unique([memberOneId, memberTwoId])
  @@index([memberTwoId])
}

model DirectMessage {
  id      String  @id @default(uuid())
  content String  @db.Text
  fileUrl String? @db.Text

  memberId String
  member   Member @relation(fields: [memberId], references: [id], onDelete: Cascade)

  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  deleted   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([memberId])
  @@index([conversationId])
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MySQL database (Planetscale)
- Clerk account
- UploadThing account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chat-platform.git
cd chat-platform
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
# .env
DATABASE_URL="mysql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
```

4. **Initialize the database**
```bash
npx prisma db push
```

5. **Start development server**
```bash
pnpm dev
```

## ⚡ Performance Optimizations

- WebSocket connection pooling
- Message batching
- Lazy loading of media
- Optimistic updates
- Efficient caching

## 🔒 Security Features

- Authentication with Clerk
- Real-time token validation
- Rate limiting
- Input sanitization
- File upload validation

## 🚀 Deployment

1. **Database Setup**
```bash
# Push database schema
npx prisma db push
```

2. **Configure Vercel**
```bash
# Set up environment variables
vercel env pull
```

3. **Deploy**
```bash
vercel deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Socket.io](https://socket.io/)
- [Prisma](https://www.prisma.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Clerk](https://clerk.dev/)
- [UploadThing](https://uploadthing.com/)
- [Tanstack Query](https://tanstack.com/query)

---

Built with 💜 by Awais Raza
