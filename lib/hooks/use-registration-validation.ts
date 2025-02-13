// import { EducationLevel, GradeLevel } from '@prisma/client'

// import { useRegistrationStore } from '@/lib/stores/use-registration-store'

// export interface ValidationError {
//   field: string
//   message: string
// }

// export function useRegistrationValidation() {
//   const studentInfo = useRegistrationStore((state) => state.studentInfo)
//   const setValidationErrors = useRegistrationStore(
//     (state) => state.setValidationErrors
//   )

//   const validateForm = (): ValidationError[] => {
//     const errors: ValidationError[] = []
//     const currentYear = new Date().getFullYear()

//     // Required Fields Validation
//     if (!studentInfo.schoolName) {
//       errors.push({
//         field: 'schoolName',
//         message: 'School name is required',
//       })
//     }

//     if (!studentInfo.educationLevel) {
//       errors.push({
//         field: 'educationLevel',
//         message: 'Education level is required',
//       })
//     }

//     if (!studentInfo.gradeLevel && studentInfo.educationLevel !== 'POST_GRAD') {
//       errors.push({
//         field: 'gradeLevel',
//         message: 'Grade level is required',
//       })
//     }

//     // Email Validation
//     if (studentInfo.email && !isValidEmail(studentInfo.email)) {
//       errors.push({
//         field: 'email',
//         message: 'Please enter a valid email address',
//       })
//     }

//     // Phone Validation
//     if (studentInfo.phone && !isValidPhone(studentInfo.phone)) {
//       errors.push({
//         field: 'phone',
//         message: 'Please enter a valid phone number',
//       })
//     }

//     // Education Level and Grade Level Validation
//     if (studentInfo.educationLevel && studentInfo.gradeLevel) {
//       const isValidGradeLevel = validateGradeLevelForEducation(
//         studentInfo.educationLevel,
//         studentInfo.gradeLevel
//       )
//       if (!isValidGradeLevel) {
//         errors.push({
//           field: 'gradeLevel',
//           message: `Invalid grade level for ${studentInfo.educationLevel.toLowerCase()} education`,
//         })
//       }
//     }

//     // // Graduation Year Validations
//     // if (studentInfo.highSchoolGraduated && !studentInfo.highSchoolGradYear) {
//     //   errors.push({
//     //     field: 'highSchoolGradYear',
//     //     message: 'High school graduation year is required',
//     //   })
//     // }

//     // if (studentInfo.collegeGraduated && !studentInfo.collegeGradYear) {
//     //   errors.push({
//     //     field: 'collegeGradYear',
//     //     message: 'College graduation year is required',
//     //   })
//     // }

//     // if (studentInfo.postGradCompleted && !studentInfo.postGradYear) {
//     //   errors.push({
//     //     field: 'postGradYear',
//     //     message: 'Post-graduation year is required',
//     //   })
//     // }

//     // Graduation Year Range Validation (within 6 years)
//     const validateGradYear = (
//       year: number | null,
//       fieldName: string
//     ): ValidationError | null => {
//       if (year && (year < currentYear - 6 || year > currentYear + 6)) {
//         return {
//           field: fieldName,
//           message: 'Graduation year must be within 6 years from current year',
//         }
//       }
//       return null
//     }

//     const highSchoolYearError = validateGradYear(
//       studentInfo.highSchoolGradYear,
//       'highSchoolGradYear'
//     )
//     if (highSchoolYearError) errors.push(highSchoolYearError)

//     const collegeYearError = validateGradYear(
//       studentInfo.collegeGradYear,
//       'collegeGradYear'
//     )
//     if (collegeYearError) errors.push(collegeYearError)

//     const postGradYearError = validateGradYear(
//       studentInfo.postGradYear,
//       'postGradYear'
//     )
//     if (postGradYearError) errors.push(postGradYearError)

//     return errors
//   }

//   const validateAndUpdateErrors = (): boolean => {
//     const errors = validateForm()
//     setValidationErrors(errors)
//     return errors.length === 0
//   }

//   return {
//     validateAndUpdateErrors,
//     validateForm,
//   }
// }

// // Helper Functions
// function isValidEmail(email: string): boolean {
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//   return emailRegex.test(email)
// }

// function isValidPhone(phone: string): boolean {
//   // Allows formats: (123) 456-7890, 123-456-7890, 1234567890
//   const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
//   return phoneRegex.test(phone)
// }

// function validateGradeLevelForEducation(
//   educationLevel: EducationLevel,
//   gradeLevel: GradeLevel
// ): boolean {
//   const validGradeLevels: Record<EducationLevel, GradeLevel[]> = {
//     HIGH_SCHOOL: ['FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR'],
//     COLLEGE: ['FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR'],
//     POST_GRAD: [], // Post grad doesn't use grade levels
//   }

//   return validGradeLevels[educationLevel].includes(gradeLevel)
// }

// // Type guard for education level
// function isValidEducationLevel(level: string): level is EducationLevel {
//   return ['HIGH_SCHOOL', 'COLLEGE', 'POST_GRAD'].includes(level)
// }

// // Type guard for grade level
// function isValidGradeLevel(level: string): level is GradeLevel {
//   return ['FRESHMAN', 'SOPHOMORE', 'JUNIOR', 'SENIOR'].includes(level)
// }
// /comment
