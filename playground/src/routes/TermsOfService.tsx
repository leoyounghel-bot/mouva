import { Link } from 'react-router-dom';
import './LegalPages.css';

export default function TermsOfService() {
  return (
    <div className="legal-page">
      {/* Background */}
      <div className="legal-background">
        <div className="legal-gradient-1" />
        <div className="legal-gradient-2" />
      </div>

      <div className="legal-container">
        {/* Header */}
        <header className="legal-header">
          <Link to="/" className="legal-back-btn">← Back</Link>
          <Link to="/" className="legal-logo">
            <img src="/logo.svg" alt="Mouva" className="logo-icon-img" />
            <span className="logo-text">Mouva</span>
          </Link>
          <div className="legal-header-spacer"></div>
        </header>

        {/* Content */}
        <main className="legal-content">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last Updated: January 18, 2026</p>

          <div className="legal-intro">
            <p>
              <em>This Terms of Service Agreement (the "Agreement") is entered into by and between Mouva ("we", "us", or "our") 
              and you ("User", "Customer", or "you"). By accessing or using our Service, you agree to be bound by these Terms.</em>
            </p>
          </div>

          <section className="legal-section">
            <h2>Agreement Overview</h2>
            <p>The "Agreement" between you and Mouva includes the following:</p>
            <ul>
              <li>This Terms of Service Agreement</li>
              <li><Link to="/privacy">Privacy Policy</Link> which outlines how Mouva processes personal data</li>
              <li>Acceptable Use Policy which sets out restrictions on content that can be uploaded or created on the Service</li>
              <li>AI Product Terms which apply when using AI-powered features</li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> By using Mouva, you agree to these Terms, our Privacy Policy, Acceptable Use Policy, 
              and AI Product Terms.
            </div>
          </section>

          <section className="legal-section legal-highlight-danger">
            <h2>Age Restrictions</h2>
            <div className="legal-warning-box">
              <h3>⚠️ MINIMUM AGE REQUIREMENT: 18 YEARS</h3>
              <p>
                <strong>You must be at least 18 years of age to use this Service.</strong> By using the 
                Service, you represent and warrant that you are at least 18 years old.
              </p>
            </div>
            
            <p>We do NOT provide access to minors under any circumstances, including:</p>
            <ul>
              <li>With parental or guardian consent</li>
              <li>For educational purposes</li>
              <li>Under adult supervision</li>
              <li>Through school or institutional accounts</li>
            </ul>
            <p>
              If we discover you are under 18 years of age, your account will be immediately terminated 
              and all data will be permanently deleted without notice or refund.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> You must be 18 or older to use Mouva. No exceptions.
            </div>
          </section>

          <section className="legal-section legal-highlight-danger">
            <h2>Acceptable Use Policy and Prohibited Content</h2>
            <div className="legal-warning-box">
              <h3>🚫 ZERO TOLERANCE POLICY</h3>
              <p>
                Violations of this section will result in <strong>immediate account termination, 
                forfeiture of any paid subscriptions, and may be reported to law enforcement</strong>.
              </p>
            </div>

            <p>
              Please be a good human when using our Service and AI Products. Do not use them to create any harmful content. 
              We will not allow any use that violates these terms, and we may suspend or terminate your account if we find 
              that you are using it in this way.
            </p>

            <h3>Absolutely Prohibited Content and Activities</h3>

            <h4>Terrorism and Violent Extremism</h4>
            <ul>
              <li>Content promoting, supporting, or inciting terrorism or terrorist organizations</li>
              <li>Instructions, guides, or plans for terrorist attacks</li>
              <li>Recruitment, radicalization, or propaganda materials for extremist groups</li>
              <li>Content glorifying, celebrating, or memorializing terrorist acts or attackers</li>
              <li>Manifestos or ideological materials promoting violent extremism</li>
              <li>Communication channels or coordination tools for terrorist activities</li>
            </ul>

            <h4>Violence and Criminal Activity</h4>
            <ul>
              <li>Content promoting, threatening, or inciting violence against any person or group</li>
              <li>Instructions for creating weapons, explosives, or harmful substances</li>
              <li>Content depicting extreme violence, gore, or torture</li>
              <li>Hit lists, death threats, or targeted harassment</li>
              <li>Content promoting mass violence, shootings, or attacks</li>
              <li>Gang-related content or criminal organization materials</li>
              <li>Human trafficking, kidnapping, or exploitation content</li>
            </ul>

            <h4>Child Safety</h4>
            <ul>
              <li>Any sexual or sexually suggestive content involving minors</li>
              <li>Child sexual abuse material (CSAM) in any form</li>
              <li>Content sexualizing or exploiting children</li>
              <li>Grooming materials or predatory content targeting minors</li>
              <li>Content promoting child abuse, neglect, or endangerment</li>
            </ul>

            <h4>Hate and Discrimination</h4>
            <ul>
              <li>Content promoting hatred based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin</li>
              <li>Genocide denial, including Holocaust denial</li>
              <li>Incitement of violence against protected groups</li>
              <li>Dehumanizing content targeting specific groups</li>
            </ul>

            <h4>Other Prohibited Content</h4>
            <ul>
              <li>Non-consensual intimate imagery (revenge porn)</li>
              <li>Drug manufacturing or distribution instructions</li>
              <li>Fraud, scam, phishing, or deceptive materials</li>
              <li>Malware, hacking tools, or cyberattack instructions</li>
              <li>Content infringing intellectual property rights</li>
              <li>Defamatory or libelous content</li>
              <li>Impersonation of individuals or organizations</li>
              <li>Spam or unauthorized commercial content</li>
            </ul>

            <h3>Enforcement</h3>
            <ul>
              <li><strong>Immediate Account Termination:</strong> No warnings, no appeals for severe violations</li>
              <li><strong>No Refunds:</strong> All paid subscriptions are forfeited</li>
              <li><strong>Evidence Preservation:</strong> We retain records for potential legal proceedings</li>
              <li><strong>Law Enforcement Reporting:</strong> We proactively report suspected criminal activity</li>
              <li><strong>Full Cooperation:</strong> We cooperate fully with law enforcement investigations</li>
            </ul>

            <div className="legal-summary">
              <strong>Summary:</strong> We have zero tolerance for terrorism, violence, child exploitation, and hate content. 
              Violations result in immediate permanent account termination and may be reported to law enforcement.
            </div>
          </section>

          <section className="legal-section">
            <h2>1. Using The Service</h2>
            
            <h3>(a) Access to the Service</h3>
            <p>
              Subject to the terms of this Agreement, Mouva will provide you access to use the Service for the duration 
              of your Subscription Term. Mouva may, at its sole discretion, modify, remove, add, or enhance features of 
              the Service from time-to-time, provided however, Mouva will not materially decrease the overall functionality 
              of the Service during the Subscription Term.
            </p>

            <h3>(b) Login Credentials</h3>
            <p>
              Each User must have unique login credentials. You shall not allow or authorize anyone other than the 
              authorized User to use such login credentials and shall promptly notify Mouva in the event you become 
              aware of any unauthorized access to or use of login credentials.
            </p>

            <h3>(c) Use Restrictions</h3>
            <p>You shall not:</p>
            <ul>
              <li>Rent, lease, sell, distribute, sublicense, or otherwise make the Service available to any third party</li>
              <li>Copy, replicate, decompile, reverse-engineer, attempt to derive the source code of, modify, or create derivative works of the Service</li>
              <li>Access the Service for purposes of performance benchmarking</li>
              <li>Access the Service for purposes of building or marketing a competitive product</li>
              <li>Use the Service in violation of any applicable law or regulation</li>
              <li>Use the Service to create, store or transmit a virus or malicious code</li>
              <li>Engage in automated extraction or scraping of content or data from the Service</li>
              <li>Attempt to bypass any safety features or content protections we've put in place</li>
            </ul>

            <h3>(d) Your Obligations</h3>
            <p>You are solely responsible for:</p>
            <ul>
              <li>Providing all hardware, software, networking, and communications capabilities necessary for your access to the Service</li>
              <li>All activities conducted under your account and compliance with the terms of this Agreement</li>
              <li>Ensuring your content complies with the Acceptable Use Policy</li>
            </ul>

            <div className="legal-summary">
              <strong>Summary:</strong> You get access to the Service, but must use it responsibly and follow our rules.
            </div>
          </section>

          <section className="legal-section">
            <h2>2. AI Product Terms</h2>
            <p>
              These terms apply to your use of Mouva's AI-powered products and tools (AI Products), including but not 
              limited to AI document generation, AI design suggestions, and any other AI features.
            </p>

            <h3>(a) Be a Good Human</h3>
            <p>
              Please be a good human when using AI Products and don't use them to create any harmful content. In addition 
              to the prohibited content listed above, it is specifically prohibited to use AI Products to:
            </p>
            <ul>
              <li>Mislead anyone that the content generated by AI Products is human-generated</li>
              <li>Provide or obtain tailored advice that requires a license, such as legal, medical or financial advice without appropriate involvement of a qualified professional</li>
              <li>Generate spam, ransomware, keyloggers, viruses or other malicious software</li>
              <li>Implement fully-automated decision making that is legally binding or has significant effects</li>
              <li>Attempt to bypass any safety features or content protections</li>
            </ul>

            <h3>(b) Using AI Products</h3>
            <p>
              You are responsible for any text you type in, or images or other content you upload, to AI Products (Input) 
              as well as the resulting material you generate (Output). By using the AI Products, you represent and warrant 
              that you have all necessary rights, licenses and permissions needed to use your Input. You are responsible 
              for ensuring that your Input and Output complies with these terms before using or sharing it.
            </p>

            <h3>(c) Ownership of AI Output</h3>
            <p>
              As between you and Mouva, and to the maximum extent permitted by applicable law, you retain your ownership 
              rights to your Input, and you own your Output. Due to the nature of our technology, outputs may not be unique, 
              and other users may receive similar outputs. Your ownership does not extend to other users' outputs.
            </p>
            <p>
              You may use your Output for any lawful purpose, provided that you comply with these terms and that you accept 
              that any such use is at your own risk.
            </p>

            <h3>(d) AI Usage Limits</h3>
            <p>
              Mouva may impose limits on the number of Outputs you can create and interactions you can have with AI Products. 
              You will be notified when you have reached the AI usage limit for your account or any AI Product.
            </p>

            <h3>(e) AI Disclaimer</h3>
            <div className="legal-warning-box">
              <p>
                The Output of AI Products is generated by artificial intelligence. <strong>Mouva has not verified the 
                accuracy of the Output and it does not represent Mouva's views.</strong>
              </p>
            </div>
            <p>
              Mouva makes no warranty or guarantee as to the accuracy, completeness or reliability of the Output, and 
              does not accept any liability or responsibility arising from your use of the Output. You are solely responsible 
              for evaluating the accuracy and appropriateness of all Outputs for your use case.
            </p>

            <h3>(f) Technology Partners</h3>
            <p>
              Mouva uses technology provided by third party service providers (Technology Partners) to provide some of our 
              AI Products. You agree and acknowledge that your Input may be shared with our Technology Partners for the 
              specific purpose of providing you with the functionality. Your Privacy Settings control whether Mouva and 
              our Technology Partners may use your data to improve our AI services.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> You own your AI-generated content, but must use AI responsibly. AI output is not 
              verified for accuracy.
            </div>
          </section>

          <section className="legal-section">
            <h2>3. Intellectual Property</h2>
            
            <h3>(a) Your Content</h3>
            <p>
              You represent and warrant that you own all rights, title, and interest in your content, or that you have 
              otherwise secured all necessary rights. As between Mouva and you, you own all right, title, and interest 
              in your content. You hereby grant Mouva a nonexclusive, royalty-free, worldwide right and license to display, 
              host, copy, and use your content solely to the extent necessary to provide the Service.
            </p>

            <h3>(b) Your Designs</h3>
            <p>
              You retain ownership of designs you create using the Service. Subject to our content policies, Mouva grants 
              you a perpetual, irrevocable, transferable, worldwide license to use, reproduce, modify, and distribute 
              designs created on the Service.
            </p>

            <h3>(c) Mouva's Intellectual Property Rights</h3>
            <p>
              Except as expressly set forth in this Agreement, all Intellectual Property Rights in and to the Service 
              remain the sole property of Mouva and its third-party licensors. Mouva owns or has legal rights to all 
              content, data, software, inventions, ideas, and other technology and intellectual property that it develops 
              in connection with the Service.
            </p>

            <h3>(d) Feedback</h3>
            <p>
              If you provide Mouva with suggestions, ideas, enhancement requests, or other feedback relating to the Service 
              ("Feedback"), you agree that Mouva may use such Feedback freely without any payment, obligation, or attribution 
              to you.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> You own your content and designs. Mouva owns the Service and its technology.
            </div>
          </section>

          <section className="legal-section">
            <h2>4. Fees and Payment</h2>
            
            <h3>(a) Payment Terms</h3>
            <p>
              Fees are set forth in your subscription plan. If any payment remains unpaid for more than thirty (30) days 
              after its due date, Mouva may suspend access to the Service until payment is received. Unless expressly 
              stated otherwise, all fees are in United States Dollars.
            </p>

            <h3>(b) Taxes</h3>
            <p>
              Unless otherwise stated, all fees are exclusive of any sales, use, value-added, withholding or other similar 
              taxes. You shall be responsible for paying all such Taxes associated with your purchase of the Service, except 
              for taxes based on Mouva's net income.
            </p>

            <h3>(c) Refunds</h3>
            <p>
              <strong>No refunds are provided for accounts terminated due to Terms violations.</strong> For other 
              circumstances, refunds are provided in accordance with our refund policy.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> Pay your subscription on time. No refunds for Terms violations.
            </div>
          </section>

          <section className="legal-section">
            <h2>5. Warranties and Disclaimer</h2>
            
            <h3>(a) Mutual Warranties</h3>
            <p>Each party represents and warrants that:</p>
            <ul>
              <li>It has the legal power and authority to enter into this Agreement</li>
              <li>It will comply with all applicable laws, regulations, and treaties in connection with its performance under this Agreement</li>
            </ul>

            <h3>(b) Disclaimer of Warranties</h3>
            <p>
              <strong>EXCEPT AS EXPRESSLY PROVIDED IN THIS AGREEMENT, THE SERVICE IS PROVIDED "AS IS" AND TO THE MAXIMUM 
              EXTENT PERMITTED BY APPLICABLE LAW, MOUVA DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, 
              STATUTORY, OR OTHERWISE. THIS INCLUDES, WITHOUT LIMITATION, ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR 
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. MOUVA DOES NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED 
              OR ERROR-FREE.</strong>
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> The Service is provided "as is" without warranties.
            </div>
          </section>

          <section className="legal-section">
            <h2>6. Limitation of Liability</h2>
            
            <h3>(a) Exclusion of Certain Damages</h3>
            <p>
              IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY CONSEQUENTIAL, INCIDENTAL, INDIRECT, SPECIAL, 
              EXEMPLARY, OR PUNITIVE DAMAGES (INCLUDING LOST PROFITS, BUSINESS INTERRUPTION, OR LOSS OF BUSINESS), EVEN 
              IF ADVISED OF THEIR POSSIBILITY.
            </p>

            <h3>(b) Liability Cap</h3>
            <p>
              EACH PARTY'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE SUBSCRIPTION FEES PAID OR 
              PAYABLE TO MOUVA IN THE TWELVE (12) MONTHS PRECEDING THE EVENT OUT OF WHICH THE LIABILITY AROSE.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> Our liability is limited to what you paid us in the past 12 months.
            </div>
          </section>

          <section className="legal-section">
            <h2>7. Indemnification</h2>
            <p>
              You agree to defend, indemnify and hold harmless Mouva and its officers, directors, employees, and agents 
              from any third-party claims arising from:
            </p>
            <ul>
              <li>Your use of the Service in violation of this Agreement or the Acceptable Use Policy</li>
              <li>Any allegation that your content infringes a third party's intellectual property rights</li>
              <li>Your violation of any applicable laws or regulations</li>
            </ul>

            <div className="legal-summary">
              <strong>Summary:</strong> You agree to cover our costs if your actions cause legal problems for us.
            </div>
          </section>

          <section className="legal-section">
            <h2>8. Term and Termination</h2>
            
            <h3>(a) Agreement Term</h3>
            <p>
              This Agreement shall continue in full force and effect for the duration of your subscription, unless 
              terminated earlier as provided hereunder.
            </p>

            <h3>(b) Subscription Renewals</h3>
            <p>
              Upon expiration of a Subscription Term, the Subscription Term will automatically renew for successive 
              terms, unless either party provides written notice of non-renewal prior to the end of the then-current 
              Subscription Term.
            </p>

            <h3>(c) Termination for Cause</h3>
            <p>Either party may terminate this Agreement immediately upon written notice if:</p>
            <ul>
              <li>The other party commits a material breach that is not capable of remedy</li>
              <li>The other party fails to cure a remediable material breach within thirty (30) days of written notice</li>
            </ul>

            <h3>(d) Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service ceases immediately. You may request your data (unless 
              terminated for Terms violation). We may delete your data in accordance with our Privacy Policy.
            </p>

            <h3>(e) Survival</h3>
            <p>
              Sections regarding Intellectual Property, Limitation of Liability, Indemnification, and other provisions 
              that by their nature should survive, shall survive any termination of this Agreement.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> Subscriptions renew automatically. We can terminate your account for violations.
            </div>
          </section>

          <section className="legal-section">
            <h2>9. Miscellaneous</h2>

            <h3>(a) Governing Law and Jurisdiction</h3>
            <p>
              This Agreement will be governed by and construed in accordance with applicable law, without regard to 
              conflict of law principles. Any legal action or proceeding arising under this Agreement shall be brought 
              in the appropriate courts.
            </p>

            <h3>(b) Relationship of Parties</h3>
            <p>
              The parties are independent contractors. This Agreement will not establish any relationship of partnership, 
              joint venture, employment, franchise, or agency between the parties.
            </p>

            <h3>(c) Force Majeure</h3>
            <p>
              Neither party shall be deemed to have breached this Agreement as a result of any delay or failure in 
              performance resulting from acts of God, network failures, acts of civil or military authorities, wars, 
              terrorism, or other occurrences beyond such party's reasonable control.
            </p>

            <h3>(d) Assignment</h3>
            <p>
              Neither party may assign this Agreement without the prior written consent of the other party. However, 
              either party may assign this Agreement in connection with a merger, acquisition, or change of control.
            </p>

            <h3>(e) Severability</h3>
            <p>
              If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions will 
              remain in full force and effect.
            </p>

            <h3>(f) Entire Agreement</h3>
            <p>
              This Agreement and any associated order forms are the complete agreement between the parties regarding its 
              subject matter and replace all prior agreements, whether written or oral. Any modifications to this Agreement 
              must be in writing.
            </p>

            <div className="legal-summary">
              <strong>Summary:</strong> Standard legal provisions covering jurisdiction, assignment, and other matters.
            </div>
          </section>

          <section className="legal-section">
            <h2>10. Contact Information</h2>
            <p>For questions about these Terms, please contact us:</p>
            <ul className="legal-contact">
              <li><strong>General Inquiries:</strong> <a href="mailto:support@mouva.ai">support@mouva.ai</a></li>
              <li><strong>Report Abuse:</strong> <a href="mailto:abuse@mouva.ai">abuse@mouva.ai</a></li>
              <li><strong>Legal:</strong> <a href="mailto:legal@mouva.ai">legal@mouva.ai</a></li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> We're here to help with any questions about these Terms.
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="legal-footer">
          <p>&copy; {new Date().getFullYear()} Mouva. All rights reserved.</p>
          <div className="legal-footer-links">
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/">Back to Home</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
