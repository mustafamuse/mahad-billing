import { Student } from './types'

// Family groups mapping
const familyGroups = {
  'family-sh-dayib': {
    members: ['Abdullahi Sh Dayib', 'Majda Sh Dayib', 'Najla Sh Dayib'],
  },
  'family-haibah': {
    members: ['Abdiwahab Haibah', 'Fatima Haibah'],
  },
  // Add more family groups as needed
}

// Base monthly rate
const BASE_RATE = 150

// Helper function to get family info for a student
function getFamilyInfo(name: string) {
  for (const [familyId, family] of Object.entries(familyGroups)) {
    if (family.members.includes(name)) {
      return {
        familyId,
        totalFamilyMembers: family.members.length,
      }
    }
  }
  return null
}

export const STUDENTS: Student[] = [
  'Abdiwahab Haibah',
  'Abdilatif Haibe',
  'Abdoul Samad Barry',
  'Abdullahi Sh Dayib',
  'Amina Guled',
  'Anzal Omar',
  'Fatima Ahmed',
  'Fatima Haibah',
  'Haarun Abdirahim Mohamed',
  'Hafsah Hassan',
  'Hamza Hired',
  'Hamza Mohamed Hassan',
  'Hoda Abdullahi',
  'Khaalid Cumar',
  'Khalid Ismail',
  'Majda Sh Dayib',
  'Mustafa Mahad',
  'Najla Sh Dayib',
  'Rukia Gesaade',
  'Samira Mohamed',
  'Ziham Noor',
].map((name, index) => {
  const familyInfo = getFamilyInfo(name)
  return {
    id: (index + 1).toString(),
    name,
    monthlyRate: BASE_RATE,
    ...(familyInfo && {
      familyId: familyInfo.familyId,
      totalFamilyMembers: familyInfo.totalFamilyMembers,
    }),
  }
})
