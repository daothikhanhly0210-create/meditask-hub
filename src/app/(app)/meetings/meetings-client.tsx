"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/components/i18n-provider";
import { MEETING_STATUSES } from "@/lib/meetings";
import { formatDate } from "@/lib/utils";
import { MeetingDialog } from "./meeting-dialog";
import type { MeetingListItem, PersonOption } from "./types";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  MINUTED: "warning",
  APPROVED: "success",
};

export function MeetingsClient({
  meetings,
  people,
  canRecord,
  locale,
}: {
  meetings: MeetingListItem[];
  people: PersonOption[];
  canRecord: boolean;
  locale: string;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return meetings.filter((meeting) => {
      if (status !== "ALL" && meeting.status !== status) return false;
      if (!query) return true;
      return (
        meeting.title.toLowerCase().includes(query) ||
        meeting.code.toLowerCase().includes(query) ||
        (meeting.location ?? "").toLowerCase().includes(query)
      );
    });
  }, [meetings, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("meetings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("meetings.subtitle")}</p>
        </div>
        {canRecord ? (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus />
            {t("meetings.newMeeting")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("meetings.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-44"
          aria-label={t("fields.status")}
        >
          <option value="ALL">{t("meetings.allStatuses")}</option>
          {MEETING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`meetings.statuses.${value}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("meetings.codeLabel")}</TableHead>
              <TableHead>{t("meetings.titleLabel")}</TableHead>
              <TableHead>{t("meetings.dateLabel")}</TableHead>
              <TableHead>{t("meetings.participantsLabel")}</TableHead>
              <TableHead>{t("meetings.actionItemsLabel")}</TableHead>
              <TableHead>{t("fields.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="mx-auto mb-2 size-6" />
                  {t("meetings.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell className="font-mono text-xs">{meeting.code}</TableCell>
                  <TableCell className="max-w-80">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {meeting.title}
                    </Link>
                    {meeting.location ? (
                      <div className="mt-1 text-xs text-muted-foreground">{meeting.location}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(meeting.meetingDate, locale)}
                  </TableCell>
                  <TableCell className="text-sm">{meeting.participantCount}</TableCell>
                  <TableCell className="text-sm">{meeting.actionItemCount}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[meeting.status] ?? "secondary"}>
                      {t(`meetings.statuses.${meeting.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MeetingDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        people={people}
      />
    </div>
  );
}
