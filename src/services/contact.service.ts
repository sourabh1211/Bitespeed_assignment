import { prisma } from "../lib/prisma.js";
import type { Contact } from "../../generated/prisma/client.js";

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export async function identifyContact(
  email: string | null,
  phoneNumber: string | null
): Promise<IdentifyResponse> {
  const whereConditions: any[] = [];
  if (email) whereConditions.push({ email });
  if (phoneNumber) whereConditions.push({ phoneNumber });

  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: whereConditions,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    });
    return buildResponse(newContact, []);
  }

  const primaryIds = await collectPrimaryIds(matchingContacts);
  let primaryContact = await getOldestPrimary(primaryIds);

  // Merge: if multiple distinct primaries exist, demote the newer ones
  if (primaryIds.size > 1) {
    for (const pid of primaryIds) {
      if (pid === primaryContact.id) continue;

      // Demote this primary to secondary
      await prisma.contact.update({
        where: { id: pid },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });

      // Re-link all secondaries of the demoted primary
      await prisma.contact.updateMany({
        where: { linkedId: pid },
        data: { linkedId: primaryContact.id },
      });
    }
  }

  // Fetch the full cluster after merging
  const allSecondaries = await prisma.contact.findMany({
    where: {
      linkedId: primaryContact.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const allContacts = [primaryContact, ...allSecondaries];

  // Check if the request contains new information not already in the cluster
  const existingEmails = new Set(
    allContacts.map((c) => c.email).filter(Boolean)
  );
  const existingPhones = new Set(
    allContacts.map((c) => c.phoneNumber).filter(Boolean)
  );

  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  if (hasNewEmail || hasNewPhone) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: "secondary",
      },
    });
    allSecondaries.push(newSecondary);
  }

  return buildResponse(primaryContact, allSecondaries);
}

async function collectPrimaryIds(contacts: Contact[]): Promise<Set<number>> {
  const primaryIds = new Set<number>();

  for (const contact of contacts) {
    if (contact.linkPrecedence === "primary") {
      primaryIds.add(contact.id);
    } else if (contact.linkedId) {
      primaryIds.add(contact.linkedId);
    }
  }

  return primaryIds;
}

async function getOldestPrimary(primaryIds: Set<number>): Promise<Contact> {
  const primaries = await prisma.contact.findMany({
    where: {
      id: { in: Array.from(primaryIds) },
    },
    orderBy: { createdAt: "asc" },
  });

  return primaries[0];
}

function buildResponse(
  primary: Contact,
  secondaries: Contact[]
): IdentifyResponse {
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];

  if (primary.email) emails.push(primary.email);
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

  for (const sec of secondaries) {
    secondaryContactIds.push(sec.id);
    if (sec.email && !emails.includes(sec.email)) {
      emails.push(sec.email);
    }
    if (sec.phoneNumber && !phoneNumbers.includes(sec.phoneNumber)) {
      phoneNumbers.push(sec.phoneNumber);
    }
  }

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}
