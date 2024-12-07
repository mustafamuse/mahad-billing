import { Student } from './types'

const familyGroups = {
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
    // Only Salman and Shuayb remain, both indicated having exactly 1 sibling
    members: ['Salman Isse', 'Shuayb Isse'],
  },
  'family-haji': {
    // Only Aisha and Yasmin remain, each with 1 sibling
    members: ['Aisha Haji', 'Yasmin Haji'],
  },
  'family-abdisamad': {
    members: ['Mohamed Abdisamad', 'Sudays Abdisamad'],
  },
}

// Base monthly rate
const BASE_RATE = 150

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
  'Mustafa Muse',
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
  'Amal Isse', // Now stands alone, no familyId
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
  'Nadira Haji', // Now stands alone, no familyId
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
