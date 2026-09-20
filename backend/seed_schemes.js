const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding dummy schemes...");

  const schemes = [
    {
      scheme_name: 'Ayushman Bharat Yojana',
      department: 'Ministry of Health and Family Welfare',
      description: 'Provides free health coverage of up to ₹5 Lakhs per family per year for secondary and tertiary care hospitalization.',
      income_threshold: 250000,
      evaluation_scope: 'HOUSEHOLD',
      redirect_link: 'https://pmjay.gov.in/'
    },
    {
      scheme_name: 'PM Awas Yojana (Urban)',
      department: 'Ministry of Housing and Urban Affairs',
      description: 'Provides housing for all in urban areas with credit-linked subsidy for EWS, LIG, and MIG.',
      income_threshold: 300000,
      evaluation_scope: 'HOUSEHOLD',
      redirect_link: 'https://pmaymis.gov.in/'
    },
    {
      scheme_name: 'Sukanya Samriddhi Yojana',
      department: 'Ministry of Women and Child Development',
      description: 'A small deposit scheme for the girl child launched as a part of the Beti Bachao Beti Padhao campaign.',
      income_threshold: null, // No strict threshold, anyone can apply for their daughter
      evaluation_scope: 'INDIVIDUAL',
      redirect_link: 'https://www.india.gov.in/sukanya-samriddhi-yojna'
    },
    {
      scheme_name: 'PM Kisan Samman Nidhi',
      department: 'Ministry of Agriculture',
      description: 'Provides income support of ₹6,000 per year in three equal installments to all landholding farmer families.',
      income_threshold: 500000,
      evaluation_scope: 'HOUSEHOLD',
      redirect_link: 'https://pmkisan.gov.in/'
    }
  ];

  for (const scheme of schemes) {
    await prisma.scheme.create({ data: scheme });
    console.log(`Created scheme: ${scheme.scheme_name}`);
  }

  console.log("Done seeding schemes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
