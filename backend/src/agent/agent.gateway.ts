import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from user sockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; projectId?: string },
  ) {
    const { userId, projectId } = data;

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join user room
    client.join(`user:${userId}`);

    // Join project room if specified
    if (projectId) {
      client.join(`project:${projectId}`);
    }

    this.logger.log(`Client ${client.id} subscribed to user:${userId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const { projectId } = data;
    client.leave(`project:${projectId}`);
  }

  @SubscribeMessage('subscribe-queue')
  handleSubscribeQueue(@ConnectedSocket() client: Socket) {
      // Security check: In a real app, verify user role here or via Guard
      client.join('admin-queue');
      this.logger.log(`Client ${client.id} subscribed to admin-queue`);
  }

  /**
   * Notify task created
   */
  notifyTaskCreated(task: any) {
    this.server.to(`user:${task.userId}`).emit('task:created', task);
    this.server.to(`project:${task.projectId}`).emit('task:created', task);
  }

  /**
   * Notify task updated
   */
  notifyTaskUpdated(task: any) {
    this.server.to(`user:${task.userId}`).emit('task:updated', task);
    this.server.to(`project:${task.projectId}`).emit('task:updated', task);
  }

  /**
   * Notify task progress
   */
  notifyTaskProgress(task: { id: string; userId: string; projectId: string; progress: number; currentStep?: string }) {
    const payload = {
      taskId: task.id,
      progress: task.progress,
      currentStep: task.currentStep,
    };
    this.server.to(`user:${task.userId}`).emit('task:progress', payload);
    this.server.to(`project:${task.projectId}`).emit('task:progress', payload);
  }

  /**
   * Notify task completed
   */
  notifyTaskCompleted(task: any) {
    this.server.to(`user:${task.userId}`).emit('task:completed', task);
    this.server.to(`project:${task.projectId}`).emit('task:completed', task);
  }

  /**
   * Notify task failed
   */
  notifyTaskFailed(task: any) {
    this.server.to(`user:${task.userId}`).emit('task:failed', {
      taskId: task.id,
      error: task.error,
    });
    this.server.to(`project:${task.projectId}`).emit('task:failed', {
      taskId: task.id,
      error: task.error,
    });
  }

  /**
   * Notify artifact created
   */
  notifyArtifactCreated(artifact: any, userId: string, projectId: string) {
    this.server.to(`user:${userId}`).emit('artifact:created', artifact);
    this.server.to(`project:${projectId}`).emit('artifact:created', artifact);
  }
}
