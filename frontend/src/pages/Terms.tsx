import { Card, CardContent } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl pb-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bluesky Investments - Terms and Conditions</h1>
        <p className="text-muted-foreground">Last updated: February 24, 2025</p>
      </div>

      {/* General Terms */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">1. General Terms</h2>
          <div className="space-y-3 text-sm">
            <p>1.1 By using the Bluesky Investments application, you agree to comply with these Terms and Conditions and any future amendments that may be made.</p>
            <p>1.2 Bluesky Investments reserves the right to modify, update, or discontinue any aspect of the service at any time without prior notice.</p>
            <p>1.3 Users must be at least 18 years old to register and use the platform.</p>
            <p>1.4 Any violation of these terms may result in account suspension or termination without prior notice.</p>
            <p>1.5 Users are responsible for maintaining the confidentiality of their account credentials and should not share them with any third party.</p>
            <p>1.6 Bluesky Investments is not liable for any losses or damages arising from unauthorized access to user accounts.</p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Rules */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">2. Investment Rules</h2>
          <div className="space-y-3 text-sm">
            <p>2.1 The minimum investment amount is KES 600, and users must adhere to this limit.</p>
            <p>2.2 Profits will only be generated on weekdays (Monday to Friday), however, you can make an investment any day of the week.</p>
            <p>2.3 Each investment expires after a period of 3 months from the date of deposit.</p>
            <p>2.4 A user can invest only twice in one product, and exceeding this limit is not allowed.</p>
            <p>2.6 Bluesky Investments guarantees profits, and all investments are subject to market conditions.</p>
          </div>
        </CardContent>
      </Card>

      {/* Deposits and Withdrawals */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">3. Deposits and Withdrawals</h2>
          <div className="space-y-3 text-sm">
            <p>3.1 Deposits can be made at any time, and users can invest any amount they choose within the prescribed limits.</p>
            <p>3.2 Withdrawals can be requested at any time, provided the minimum withdrawal amount of KES 200 is met.</p>
            <p>3.3 Only earnings from investments can be withdrawn; deposited funds cannot be withdrawn under any circumstances.</p>
            <p>3.4 All transactions are exclusively conducted in Kenya Shillings (KES) through M-Pesa to ensure secure and efficient processing.</p>
            <p>3.5 Withdrawal requests are processed within 24 hours from the time of request submission, and users should ensure they provide correct M-Pesa details.</p>
            <p>3.6 Any incorrect withdrawal details provided by the user may result in delays or failed transactions, for which Bluesky Investments holds no responsibility. All withdrawals will be sent to the number you registered with.</p>
            <p>3.7 Users should verify their transactions and report any discrepancies to customer support within 48 hours.</p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Limits */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">4. Investment Limits</h2>
          <div className="space-y-3 text-sm">
            <p>4.1 The maximum investment across all pairs is KES 20,000, except for the following:</p>
            <ul className="list-disc pl-5">
              <li>EUR/AUD: KES 50,000</li>
              <li>USD/CAD: KES 50,000</li>
              <li>NZD/USD: KES 200,000</li>
            </ul>
            <p>4.2 Users must adhere to these limits, and any attempt to exceed them may result in the rejection of the investment.</p>
            <p>4.3 Bluesky Investments reserves the right to adjust investment limits based on market conditions and user demand.</p>
          </div>
        </CardContent>
      </Card>

      {/* Fraud and Account Termination */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">5. Fraud and Account Termination</h2>
          <div className="space-y-3 text-sm">
            <p>5.1 Any signs of fraudulent activities will lead to immediate account termination without prior notice.</p>
            <p>5.2 Fraudulent activities include, but are not limited to, sending fake M-Pesa messages to the support team, attempting to manipulate transactions, or using multiple accounts to bypass investment limits.</p>
            <p>5.3 Users found engaging in fraudulent activities will be permanently banned from the platform, and legal action may be taken where necessary.</p>
            <p>5.4 Bluesky Investments reserves the right to conduct periodic audits and verify user transactions to prevent fraudulent activities.</p>
          </div>
        </CardContent>
      </Card>

      {/* Support and Assistance */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">6. Support and Assistance</h2>
          <div className="space-y-3 text-sm">
            <p>6.1 Users can seek assistance through Telegram for inquiries, technical difficulties, or compliments regarding our services.</p>
            <p>6.2 The support team is available during standard business hours, and response times may vary depending on the volume of inquiries.</p>
            <p>6.3 Users should provide clear details of their issue when contacting support to facilitate efficient resolution.</p>
          </div>
        </CardContent>
      </Card>

      {/* Referral Program */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">7. Referral Program</h2>
          <div className="space-y-3 text-sm">
            <p>7.1 Users can earn daily rewards for inviting new members to join Bluesky Investments.</p>
            <p>7.2 A one-time reward is granted for each successful referral who completes their first investment.</p>
            <p>7.3 Users found engaging in referral fraud, such as creating fake accounts, will have their rewards revoked and accounts suspended.</p>
            <p>7.4 Referral rewards are subject to change, and Bluesky Investments reserves the right to modify the program at any time.</p>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">8. Accessibility</h2>
          <div className="space-y-3 text-sm">
            <p>8.1 The Bluesky Investments application is accessible from both mobile browsers and computers, ensuring seamless user experience across different devices.</p>
            <p>8.2 Users must ensure they have a stable internet connection to access the platform without disruptions.</p>
            <p>8.3 Bluesky Investments is not responsible for any accessibility issues arising from user-side technical problems.</p>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgment */}
      <div className="text-sm">
        <p>By using Bluesky Investments, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.</p>
      </div>
    </div>
  );
}