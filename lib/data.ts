import { Student } from './types'

// ---------------------------------------
// Configuration & Constants
// ---------------------------------------
export const BASE_RATE = 150

// ---------------------------------------
// Family Groups Data
// ---------------------------------------
const FAMILY_GROUPS = {
  'family-dayib': {
    members: ['Abdullahi Dayib', 'Majda Dayib', 'Najla Dayib'],
  },
  'family-haibah': {
    members: [
      'Abdiwahab Haibah',
      'Fatima Haibah',
      'Abdishakur Haibah',
      'Abdiladif Haibah',
    ],
  },
  'family-isse': {
    members: ['Salman Isse', 'Shuayb Isse'],
  },
  'family-haji': {
    members: ['Aisha Haji', 'Yasmin Haji'],
  },
  'family-abdisamad': {
    members: ['Mohamed Abdisamad', 'Sudays Abdisamad', 'Liban Abdisamad'],
  },
  'family-yusuf': {
    members: ['Adnan Yussuf', 'Anwar Yusuf'],
  },
}

// ---------------------------------------
// Class Assignments
// ---------------------------------------
const CLASS_ASSIGNMENTS = {
  'irshad-1': [
    'Abdiladif Haibah',
    'Abdishakur Haibah',
    'Abdiwahab Haibah',
    'Abdoul Barry',
    'Abdullahi Dayib',
    'Amina Guled',
    'Anzal Omar',
    'Fatima Ahmed',
    'Fatima Haibah',
    'Haarun Abdirahim Mohamed',
    'Hafsa Hassan',
    'Hamza Hired',
    'Hamza Mohamed Hassan',
    'Hoda Abdullahi',
    'Khalid Ismail',
    'Majda Dayib',
    'Najla Dayib',
    'Samiro Mohamed',
    'Zihaam Nor',
    'Mustafa Muse',
  ],
  'irshad-2': [
    'Aaliyah Ismail',
    'Abdulkadir Mohamud',
    'Abdulmalik Mohamud',
    'Adnan Yussuf',
    'Ahmed Adan',
    'Aisha Dahir',
    'Aisha Elmoge',
    'Aisha Haji',
    'Amal Isse',
    'Anwar Yusuf',
    'Ayan Hassan',
    'Bilal Gani',
    'Deeqa Jama',
    'Gani Gani',
    'Hafsa Abdulmalik',
    'Hannan Abdi',
    'Hirse Omar',
    'Ikhlas Hassan',
    'Ilwad Hassan',
    'Khadija Ali-Daar',
    'Liban Abdisamad',
    'Lujayn Ahmed',
    'Maryam Ali',
    'Mohamed Abdisamad',
    'Mohamed Farah',
    'Nadira Haji',
    'Nassra Mohsin',
    'Nasteho Mowlid Abdiqadir',
    'Rahma Abdullahi',
    'Rahma Dek',
    'Rahma Yusuf',
    'Sagal Mohamud',
    'Salma Dayib',
    'Salma Farah',
    'Salman Isse',
    'Samira Moalim',
    'Shamis Mohamud',
    'Shuayb Isse',
    'Sudays Abdisamad',
    'Sumaya Hassan',
    'Sumaya Moalim',
    'Sumaya Omar',
    'Ugbad Dek',
    'Yasmin Haji',
    'Zamzam Farah',
  ],
  'abubakar-1': [
    'Hamse Hassen',
    'Rania Hussein',
    'Halima Mume',
    'Salma Omar',
    'Hodo Ahmed',
    'Rahma Farah',
    'Najma Adeys',
    'Darartu Elemo',
    'Ikram Abdulkadir',
    'Sagal Dahir',
    'Samiro Bong',
    'Salahu-Din Hussein',
  ],
}

// ---------------------------------------
// Helper Functions
// ---------------------------------------

function getFamilyInfo(name: string) {
  for (const [familyId, family] of Object.entries(FAMILY_GROUPS)) {
    if (family.members.includes(name)) {
      return {
        familyId,
        totalFamilyMembers: family.members.length,
      }
    }
  }
  return null
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1].toLowerCase()
}

function sortByLastName(names: string[]): string[] {
  return names.sort((a, b) => {
    const aLast = getLastName(a)
    const bLast = getLastName(b)
    return aLast.localeCompare(bLast)
  })
}

function getClassName(name: string): string | null {
  for (const [className, students] of Object.entries(CLASS_ASSIGNMENTS)) {
    if (students.includes(name)) {
      return className
    }
  }
  return null
}

function calculateDiscount(siblings: number): number {
  if (siblings >= 3) return 50
  if (siblings === 2) return 30
  if (siblings === 1) return 20
  return 0
}

// ---------------------------------------
// Student Data
// ---------------------------------------
const sortedNames = sortByLastName(Object.values(CLASS_ASSIGNMENTS).flat())

export const STUDENTS: Student[] = sortedNames.map((name, index) => {
  const familyInfo = getFamilyInfo(name)
  const className = getClassName(name) || 'unassigned'
  const siblingsCount = familyInfo ? familyInfo.totalFamilyMembers - 1 : 0 // Exclude the student
  const discount = calculateDiscount(siblingsCount)

  return {
    id: (index + 1).toString(),
    name,
    className,
    monthlyRate: BASE_RATE - discount,
    ...(familyInfo && {
      familyId: familyInfo.familyId,
      totalFamilyMembers: familyInfo.totalFamilyMembers,
    }),
    siblings: siblingsCount, // Optional, if sibling count is needed per student
  }
})
