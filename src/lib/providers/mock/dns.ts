import { randomUUID } from "crypto";
import type { DnsProvider, DnsRecordInput, DnsRecordResult } from "@/lib/providers/types";

const records = new Map<string, DnsRecordResult[]>();

function seed(domain: string) {
  if (records.has(domain)) return;
  records.set(domain, [
    { id: randomUUID(), type: "A", host: "@", value: "192.0.2.10", ttl: 3600 },
    { id: randomUUID(), type: "CNAME", host: "www", value: domain, ttl: 3600 },
    {
      id: randomUUID(),
      type: "MX",
      host: "@",
      value: `mail.${domain}`,
      ttl: 3600,
      priority: 10,
    },
    {
      id: randomUUID(),
      type: "TXT",
      host: "@",
      value: `v=spf1 include:_spf.${domain} ~all`,
      ttl: 3600,
    },
  ]);
}

export class MockDnsProvider implements DnsProvider {
  async getDnsRecords(domain: string) {
    seed(domain);
    return records.get(domain) ?? [];
  }

  async createDnsRecord(domain: string, record: DnsRecordInput) {
    seed(domain);
    const created: DnsRecordResult = {
      id: randomUUID(),
      ttl: 3600,
      ...record,
    };
    const list = records.get(domain) ?? [];
    list.push(created);
    records.set(domain, list);
    return created;
  }

  async updateDnsRecord(domain: string, recordId: string, record: DnsRecordInput) {
    seed(domain);
    const list = records.get(domain) ?? [];
    const index = list.findIndex((item) => item.id === recordId);
    if (index < 0) throw new Error("RECORD_NOT_FOUND");
    list[index] = { ...list[index], ...record, id: recordId };
    records.set(domain, list);
    return list[index];
  }

  async deleteDnsRecord(domain: string, recordId: string) {
    const list = records.get(domain) ?? [];
    records.set(
      domain,
      list.filter((item) => item.id !== recordId),
    );
  }
}

export const mockDnsProvider = new MockDnsProvider();
