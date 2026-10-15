import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getTranslator } from "@/i18n";
import {
  canCloseTarget,
  canCreateWorkOrder,
  canFollowWorkOrder,
  canWorkOnSubTask,
  derivedWorkOrderStatus,
  isOverdue,
  isPriority,
  isSubTaskStatus,
  isTargetComplete,
  managesTarget,
  subTaskProgress,
  targetProgress,
  workOrderProgress,
  workOrderScope,
} from "@/lib/tasks";
import { DetailClient } from "./detail-client";
import type {
  AttachmentItem,
  CommentItem,
  PersonRef,
  SubTaskItem,
  TargetItem,
  WorkOrderDetail,
} from "../types";

function toComment(comment: {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
  author: { name: string };
}): CommentItem {
  return {
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
  };
}

function toAttachment(attachment: {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedById: string;
  uploadedBy: { name: string };
}): AttachmentItem {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploadedById: attachment.uploadedById,
    uploadedByName: attachment.uploadedBy.name,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("task:view");
  const { locale } = await getTranslator();

  const workOrder = await prisma.workOrder.findFirst({
    where: { AND: [{ id }, workOrderScope(user)] },
    include: {
      createdBy: { select: { id: true, name: true } },
      followers: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        include: { uploadedBy: { select: { name: true } } },
      },
      targets: {
        orderBy: { department: { name: "asc" } },
        include: {
          department: { select: { id: true, name: true } },
          head: { select: { id: true, name: true } },
          closedBy: { select: { id: true, name: true } },
          subTasks: {
            orderBy: { createdAt: "asc" },
            include: {
              mainAssignee: { select: { id: true, name: true } },
              createdBy: { select: { name: true } },
              approvedBy: { select: { name: true } },
              collaborators: {
                include: { user: { select: { id: true, name: true } } },
              },
              comments: {
                orderBy: { createdAt: "asc" },
                include: { author: { select: { name: true } } },
              },
              attachments: {
                orderBy: { createdAt: "asc" },
                include: { uploadedBy: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!workOrder) notFound();

  const departmentIds = workOrder.targets.map((target) => target.departmentId);
  const [memberRows, departmentRows] = await Promise.all([
    departmentIds.length
      ? prisma.user.findMany({
          where: { departmentId: { in: departmentIds }, isActive: true },
          select: { id: true, name: true, departmentId: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const membersByDepartment = new Map<string, PersonRef[]>();
  for (const member of memberRows) {
    if (!member.departmentId) continue;
    const list = membersByDepartment.get(member.departmentId) ?? [];
    list.push({ id: member.id, name: member.name });
    membersByDepartment.set(member.departmentId, list);
  }

  const follow = canFollowWorkOrder(user);
  const closeAllowed = canCloseTarget(user);
  const followerIds = new Set(workOrder.followers.map((follower) => follower.userId));
  const followerOptions = follow
    ? (
        await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      ).filter((candidate) => !followerIds.has(candidate.id))
    : [];

  const isBoard = canCreateWorkOrder(user);

  const targets: TargetItem[] = workOrder.targets.map((target) => {
    const targetLike = {
      closedAt: target.closedAt,
      subTasks: target.subTasks.map((subTask) => ({
        status: subTask.status,
      })),
    };
    const canManage = managesTarget(user, {
      departmentId: target.departmentId,
      headId: target.headId,
    });

    const subTasks: SubTaskItem[] = target.subTasks.map((subTask) => ({
      id: subTask.id,
      title: subTask.title,
      description: subTask.description,
      status: isSubTaskStatus(subTask.status) ? subTask.status : "NEW",
      priority: isPriority(subTask.priority) ? subTask.priority : "NORMAL",
      dueDate: subTask.dueDate ? subTask.dueDate.toISOString() : null,
      progress: subTaskProgress(subTask.status),
      mainAssignee: subTask.mainAssignee
        ? { id: subTask.mainAssignee.id, name: subTask.mainAssignee.name }
        : null,
      collaborators: subTask.collaborators.map((collaborator) => ({
        id: collaborator.user.id,
        name: collaborator.user.name,
      })),
      createdByName: subTask.createdBy.name,
      rejectReason: subTask.rejectReason,
      overdue: isOverdue(subTask.dueDate, subTask.status === "DONE"),
      comments: subTask.comments.map(toComment),
      attachments: subTask.attachments.map(toAttachment),
      canWork: canWorkOnSubTask(user, subTask) || canManage,
      canManage,
    }));

    return {
      id: target.id,
      departmentId: target.departmentId,
      departmentName: target.department.name,
      head: target.head ? { id: target.head.id, name: target.head.name } : null,
      progress: targetProgress(targetLike),
      complete: isTargetComplete(targetLike),
      closedAt: target.closedAt ? target.closedAt.toISOString() : null,
      closedReason: target.closedReason,
      closedByName: target.closedBy?.name ?? null,
      canClose: closeAllowed,
      canViewProgress: isBoard || canManage,
      canManage,
      members: membersByDepartment.get(target.departmentId) ?? [],
      subTasks,
    };
  });

  const overallTargets = workOrder.targets.map((target) => ({
    closedAt: target.closedAt,
    subTasks: target.subTasks.map((subTask) => ({
      status: subTask.status,
    })),
  }));

  const detail: WorkOrderDetail = {
    id: workOrder.id,
    code: workOrder.code,
    title: workOrder.title,
    description: workOrder.description,
    status: derivedWorkOrderStatus(overallTargets, workOrder.status),
    priority: isPriority(workOrder.priority) ? workOrder.priority : "NORMAL",
    dueDate: workOrder.dueDate ? workOrder.dueDate.toISOString() : null,
    progress: workOrderProgress(overallTargets),
    overdue: isOverdue(workOrder.dueDate, workOrder.status === "DONE"),
    createdBy: { id: workOrder.createdBy.id, name: workOrder.createdBy.name },
    createdAt: workOrder.createdAt.toISOString(),
    targets,
    followers: workOrder.followers.map((follower) => ({
      id: follower.user.id,
      name: follower.user.name,
    })),
    followerOptions,
    departmentOptions: departmentRows,
    comments: workOrder.comments.map(toComment),
    attachments: workOrder.attachments.map(toAttachment),
    canManageWorkOrder: isBoard,
    canFollow: follow,
    currentUserId: user.id,
  };

  return <DetailClient workOrder={detail} locale={locale === "vi" ? "vi-VN" : "en-US"} />;
}
