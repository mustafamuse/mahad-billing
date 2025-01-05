import axios from 'axios'
import { table, TableUserConfig } from 'table'

interface StudentSubscription {
  studentName: string
  amountPaid: number
  nextPaymentAmount: number
  monthsPaid: number
  enrollmentDate: string
  firstPaymentDate: string
  nextPaymentDate: string
  subscriptionStatus: string
  payer: string
}

async function getActiveSubscriptions() {
  try {
    const response = await axios.get(
      'http://localhost:3000/api/admin/active-subscriptions'
    )

    if (response.data.success) {
      const subscriptions: StudentSubscription[] = response.data.data

      const tableData = [
        [
          'Student Name',
          'Amount Paid',
          'Next Payment Amount',
          'Months Paid',
          'Enrollment Date',
          'First Payment',
          'Next Payment',
          'Status',
          'Payer',
        ],
      ]

      subscriptions.forEach((sub) => {
        tableData.push([
          sub.studentName,
          `$${sub.amountPaid.toFixed(2)}`,
          `$${sub.nextPaymentAmount.toFixed(2)}`,
          `${sub.monthsPaid} months`,
          sub.enrollmentDate,
          sub.firstPaymentDate,
          sub.nextPaymentDate,
          `${sub.subscriptionStatus}${!sub.firstPaymentDate ? ' (pending)' : ''}`,
          sub.payer,
        ])
      })

      const config: TableUserConfig = {
        columns: {
          0: { alignment: 'left' }, // Student Name
          1: { alignment: 'right' }, // Amount Paid
          2: { alignment: 'right' }, // Next Payment Amount
          3: { alignment: 'center' }, // Months Paid
          4: { alignment: 'left' }, // Enrollment Date
          5: { alignment: 'left' }, // First Payment
          6: { alignment: 'left' }, // Next Payment
          7: { alignment: 'center' }, // Status
          8: { alignment: 'left' }, // Payer
        },
        border: {
          topBody: `─`,
          topJoin: `┬`,
          topLeft: `┌`,
          topRight: `┐`,
          bottomBody: `─`,
          bottomJoin: `┴`,
          bottomLeft: `└`,
          bottomRight: `┘`,
          bodyLeft: `│`,
          bodyRight: `│`,
          bodyJoin: `│`,
          joinBody: `─`,
          joinLeft: `├`,
          joinRight: `┤`,
          joinJoin: `┼`,
        },
      }

      console.log('\nActive Subscriptions Report\n')
      console.log(table(tableData, config))
      console.log(
        `Total Active Subscriptions (Students): ${subscriptions.length}\n`
      )
    }
  } catch (error) {
    console.error('Failed to fetch active subscriptions:', error)
  }
}

getActiveSubscriptions()
