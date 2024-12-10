import { Student } from './types'
import { getFamilyDiscount } from './utils'

// ---------------------------------------
// Configuration & Constants
// ---------------------------------------
export const BASE_RATE = 150

// ---------------------------------------
// Family Groups Data
// ---------------------------------------
const FAMILY_GROUPS = {
  'family-sh-dayib': {
    members: ['Abdullahi Dayib Ahmed', 'Majda Sh Dayib', 'Najla Sh Dayib'],
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
    members: ['Mohamed Abdisamad', 'Sudays Abdisamad'],
  },
  'family-yusuf': {
    members: ['Adnan Yussuf', 'Anwar Yusuf'],
  },
}

// ---------------------------------------
// Helper Functions
// ---------------------------------------

/**
 * Retrieves family information for a given student name.
 * Returns the familyId and totalFamilyMembers if found, otherwise null.
 */
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

/**
 * Extracts the last name from a full name string.
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1].toLowerCase()
}

/**
 * Sorts an array of names alphabetically by their last name.
 */
function sortByLastName(names: string[]): string[] {
  return names.sort((a, b) => {
    const aLast = getLastName(a)
    const bLast = getLastName(b)
    return aLast.localeCompare(bLast)
  })
}

// ---------------------------------------
// Student Data
// ---------------------------------------
const NAMES = [
  'Aisha Elmoge',
  'Maryam Ali',
  'Shamis Mohamud',
  'Salma Farah',
  'Adnan Yussuf',
  'Hannan Abdi',
  'Salman Isse',
  'Samira Moalim',
  'Aaliyah Ismail',
  'Bilal Gani',
  'Fatima Haibah',
  'Hoda Abdullahi',
  'Hamza Hired',
  'Anzal Omar',
  'Amina Guled',
  'Zihaam Nor',
  'Nasteho Mowlid Abdiqadir',
  'Sumaya Omar',
  'Mohamed Abdisamad',
  'Abdishakur Haibah',
  'Ayan Hassan',
  'Rahma Yusuf',
  'Aisha Dahir',
  'Rahma Abdullahi',
  'Samiro Mohamed',
  'Amal Isse', // no familyId
  'Salma Dayib',
  'Shuayb Isse',
  'Ilwad Hassan',
  'Ikhlas Hassan',
  'Sudays Abdisamad',
  'Aisha Haji',
  'Gani Gani',
  'Abdullahi Dayib Ahmed',
  'Rahma Dek',
  'Yasmin Haji',
  'Sagal Mohamud',
  'Ugbad Dek',
  'Zamzam Farah',
  'Anwar Yusuf',
  'Mohamed Farah',
  'Sumaya Moalim',
  'Khadija Ali-Daar',
  'Nadira Haji', // no familyId
  'Hirse Omar',
  'Sumaya Hassan',
  'Lujayn Ahmed',
  'Deeqa Jama',
  'Fatima Ahmed',
  'Ahmed Adan',
  'Haarun Abdirahim Mohamed',
  'Abdulkadir Mohamud',
  'Hafsa Hassan',
  'Abdiwahab Haibah',
  'Abdiladif Haibah',
  'Abdulmalik Mohamud',
  'Khalid Ismail',
  'Hamza Mohamed Hassan',
  'Abdoul Barry',
  'Nassra Mohsin',
  'Hafsa Abdulmalik',
]

// ---------------------------------------
// Generate the Final STUDENTS Array
// ---------------------------------------
const sortedNames = sortByLastName(NAMES)

export const STUDENTS: Student[] = sortedNames.map((name, index) => {
  const familyInfo = getFamilyInfo(name)

  // Calculate the monthly rate with family discount if applicable
  const monthlyRate = familyInfo
    ? BASE_RATE - getFamilyDiscount(familyInfo.totalFamilyMembers)
    : BASE_RATE

  return {
    id: (index + 1).toString(),
    name,
    monthlyRate,
    ...(familyInfo && {
      familyId: familyInfo.familyId,
      totalFamilyMembers: familyInfo.totalFamilyMembers,
    }),
  }
})
