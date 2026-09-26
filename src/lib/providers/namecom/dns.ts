import {
  namecomCreateRecord,
  namecomDeleteRecord,
  namecomListRecords,
  namecomUpdateRecord,
  type NamecomRecord,
} from "@/lib/providers/namecom/api";
import type { DnsProvider, DnsRecordInput, DnsRecordResult } from "@/lib/providers/types";

function mapRecord(record: NamecomRecord): DnsRecordResult {
  return {
    id: String(record.id ?? ""),
    type: (record.type ?? "A") as DnsRecordResult["type"],
    host: record.host || "@",
    value: record.answer ?? "",
    ttl: record.ttl ?? 3600,
    priority: record.priority ?? null,
  };
}

function recordBody(record: DnsRecordInput) {
  const body: Record<string, unknown> = {
    type: record.type,
    host: record.host === "@" ? "" : record.host,
    answer: record.value,
    ttl: Math.max(record.ttl ?? 300, 300),
  };
  if (record.priority != null) body.priority = record.priority;
  return body;
}

export class NamecomDnsProvider implements DnsProvider {
  async getDnsRecords(domain: string) {
    const data = await namecomListRecords(domain);
    return (data.records ?? []).map(mapRecord);
  }

  async createDnsRecord(domain: string, record: DnsRecordInput) {
    return mapRecord(await namecomCreateRecord(domain, recordBody(record)));
  }

  async updateDnsRecord(domain: string, recordId: string, record: DnsRecordInput) {
    return mapRecord(
      await namecomUpdateRecord(domain, recordId, { ...recordBody(record), id: Number(recordId) }),
    );
  }

  async deleteDnsRecord(domain: string, recordId: string) {
    await namecomDeleteRecord(domain, recordId);
  }
}

export const namecomDnsProvider = new NamecomDnsProvider();
