import { Link } from 'react-router-dom';
import './LegalPages.css';

export default function PrivacyPolicy() {
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
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: January 18, 2026</p>
          
          <div className="legal-intro">
            <p>
              <em>The highlighted sections below are aimed to give a plain English summary of our Privacy Policy. 
              Please ensure you read the main text, as the plain English summary is just a summary and doesn't capture all of the terms.</em>
            </p>
          </div>

          <section className="legal-section">
            <h2>What does this policy cover</h2>
            <p>
              Welcome to Mouva. Our Privacy Policy explains how Mouva ("we", "our", or "us") collects, uses, 
              discloses, and protects information when you use our AI-powered PDF generation service (the "Service") 
              or interact with us, and your choices about the collection and use of your information. Capitalized 
              terms that are not defined in this Privacy Policy have the meaning given to them in our Terms of Service. 
              If you do not want your information processed in accordance with this Privacy Policy in general or any 
              part of it, you should not use our Service. This policy applies to all users of the Service.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Welcome, here is our policy on privacy. This policy sets out how Mouva collects 
              and uses the information about you when you use the Service. This policy also explains the choices that 
              you can make about the way that we use your information.
            </div>
          </section>

          <section className="legal-section legal-highlight-danger">
            <h2>Age Restrictions and Child Protection</h2>
            <div className="legal-warning-box">
              <h3>⚠️ STRICT AGE REQUIREMENT: 18 YEARS OR OLDER</h3>
              <p>
                <strong>Our Service is strictly prohibited for persons under 18 years of age.</strong> 
                We do not knowingly collect, solicit, or process personal information from anyone under 
                the age of 18 (minors). Unlike some services, we do NOT accept parental consent for minor use.
              </p>
            </div>
            
            <h3>Comprehensive Child Protection Measures</h3>
            <ul>
              <li><strong>Age Verification:</strong> All users must confirm they are 18 years of age or older during account registration.</li>
              <li><strong>No Parental Consent Exception:</strong> We do NOT accept parental consent for minor use. Minors are completely prohibited from using this Service.</li>
              <li><strong>No Educational Institution Versions:</strong> We do not provide a version of our Service for K-12 educational institutions or students.</li>
              <li><strong>Content Monitoring:</strong> Our AI systems are designed to detect and prevent the creation of content that may be harmful to minors.</li>
              <li><strong>Immediate Account Termination:</strong> If we discover that a user is under 18 years of age, their account will be immediately terminated and all associated data will be permanently deleted within 24 hours.</li>
            </ul>

            <h3>Reporting Underage Users</h3>
            <p>
              If you believe a minor is using our Service, please contact us immediately at 
              <a href="mailto:privacy@mouva.ai"> privacy@mouva.ai</a>. We will investigate all reports 
              and take appropriate action within 24 hours.
            </p>

            <h3>Data Deletion for Minors</h3>
            <p>
              If we learn that we have collected personal information from a person under 18 years of age:
            </p>
            <ul>
              <li>We will immediately suspend the account</li>
              <li>Delete all personal information within 24 hours</li>
              <li>Delete all user-generated content within 24 hours</li>
              <li>Notify any relevant authorities if required by law</li>
            </ul>

            <div className="legal-summary">
              <strong>Summary:</strong> Our Service is strictly for adults 18 years of age and older. We do not allow minors 
              under any circumstances, and we do not provide educational versions of our Service.
            </div>
          </section>

          <section className="legal-section legal-highlight-danger">
            <h2>Prohibited Content and Activities</h2>
            <div className="legal-warning-box">
              <h3>🚫 ZERO TOLERANCE POLICY</h3>
              <p>
                We maintain a <strong>ZERO TOLERANCE</strong> policy for the following content and activities. 
                Violation will result in immediate account termination and may be reported to law enforcement.
              </p>
            </div>

            <h3>Absolutely Prohibited Content</h3>
            
            <h4>Terrorism and Violent Extremism</h4>
            <ul>
              <li>Content promoting, glorifying, or inciting terrorist activities</li>
              <li>Instructions for carrying out violent attacks or terrorist acts</li>
              <li>Propaganda from designated terrorist organizations</li>
              <li>Content celebrating or memorializing terrorist acts or perpetrators</li>
              <li>Recruitment materials for extremist or terrorist groups</li>
              <li>Manifestos or ideological materials promoting violent extremism</li>
            </ul>

            <h4>Violence and Criminal Activity</h4>
            <ul>
              <li>Content depicting or promoting murder, assault, or physical violence</li>
              <li>Instructions for creating weapons, explosives, or harmful devices</li>
              <li>Content promoting or glorifying mass violence</li>
              <li>Hit lists, death threats, or targeted harassment</li>
              <li>Content depicting torture, mutilation, or extreme violence</li>
              <li>Human trafficking, kidnapping, or exploitation content</li>
            </ul>

            <h4>Child Safety</h4>
            <ul>
              <li>Any sexual content involving minors (CSAM)</li>
              <li>Content that sexualizes minors in any way</li>
              <li>Grooming materials or content</li>
              <li>Content promoting child abuse or exploitation</li>
            </ul>

            <h4>Hate Speech and Discrimination</h4>
            <ul>
              <li>Content promoting hatred based on race, ethnicity, religion, gender, sexual orientation, disability, or nationality</li>
              <li>Holocaust denial or genocide denial</li>
              <li>Content promoting discrimination or violence against protected groups</li>
            </ul>

            <h4>Other Prohibited Activities</h4>
            <ul>
              <li>Non-consensual intimate imagery</li>
              <li>Drug manufacturing or distribution instructions</li>
              <li>Fraud, scam, or phishing materials</li>
              <li>Malware, hacking tools, or computer attack instructions</li>
            </ul>

            <h3>Content Detection and Enforcement</h3>
            <ul>
              <li><strong>AI-Powered Detection:</strong> Our systems automatically scan all generated content for prohibited material</li>
              <li><strong>Human Review:</strong> Flagged content is reviewed by trained moderators</li>
              <li><strong>User Reporting:</strong> Users can report suspicious content for immediate review</li>
              <li><strong>Proactive Monitoring:</strong> We actively monitor for patterns indicating abuse</li>
            </ul>

            <h3>Consequences of Violations</h3>
            <ul>
              <li>Immediate and permanent account termination</li>
              <li>Retention of evidence for potential legal proceedings</li>
              <li>Reporting to relevant law enforcement agencies</li>
              <li>Cooperation with ongoing investigations</li>
              <li>Civil and/or criminal liability as applicable under law</li>
            </ul>

            <div className="legal-summary">
              <strong>Summary:</strong> We have zero tolerance for terrorism, violence, child exploitation, and hate content. 
              Violations result in immediate account termination and may be reported to law enforcement.
            </div>
          </section>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>We collect the following types of information about you:</p>

            <h3>(a) Information you provide us directly</h3>
            <p>
              We may ask for certain information when you register for a Mouva account or interact with us 
              (such as a username, your first and last names, birthdate, phone number, profession, physical 
              and e-mail address).
            </p>
            <p>
              We also collect any messages you send us through the Service (such as user feedback, search queries 
              and prompts), and may collect information you provide in User Content you create using the Service 
              (such as text, images, and documents you upload or generate). We use this information to operate, 
              maintain, improve and provide the features and functionality of the Service to you, to correspond 
              with you, and to address any issues you raise about the Service.
            </p>
            <p>
              If you don't provide your personal information to us, you may not be able to access or use our 
              Service or your experience of using our Service may not be as enjoyable.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> We collect info about you that you choose to give us, for example when you register 
              an account, use the Service or otherwise interact with us.
            </div>

            <h3>(b) Information we receive from third-party applications or services</h3>
            <p>
              We may receive information about you from third parties. For example, if you access the Service 
              through a third-party connection or log-in, such as Google or Microsoft, that third party may pass 
              certain information about your use of its service to Mouva. This information could include, but is 
              not limited to, the user ID associated with your account, an access token necessary to access that 
              service, any information that you have permitted the third party to share with us, and any information 
              you have made public in connection with that service.
            </p>
            <p>
              You should always review, and if necessary, adjust your privacy settings on third-party websites and 
              services before linking or connecting them to the Service. You may also unlink your third party account 
              from the Service by adjusting your settings on the third party service.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> When you use our Service, for example, if you log in through a third-party application, 
              we may obtain information about you from such third-party application.
            </div>

            <h3>(c) Information we collect from you automatically</h3>
            <p>
              We will directly collect or generate certain information about your use of the Service (such as user 
              activity data, analytics event data, and clickstream data) for data analytics and machine learning, 
              and to help us measure traffic and usage trends for the Service. We may also use third party analytics 
              tools that automatically collect information sent by your browser or mobile device.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> We collect and generate certain info about how you use our Service automatically. 
              This helps us to provide and improve the Service for you.
            </div>

            <h3>(d) Cookies information and similar technologies</h3>
            <p>
              When you visit the Service, we (and our third-party partners) will create online identifiers and collect 
              information using cookies and similar technologies ("Cookies") — small text files that uniquely identify 
              your browser and let Mouva do things like help you log in faster, enhance your navigation through the site, 
              remember your preferences and generally improve the user experience.
            </p>
            <p>
              You can control or reset your cookies and similar technologies through your web browser, which will allow 
              you to customize your cookie preferences and to refuse all cookies or to indicate when a cookie is being sent. 
              However, some features of the Service may not function properly if the ability to accept cookies is disabled.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> We use cookies to help you use Mouva and for other business purposes.
            </div>

            <h3>(e) Log file information</h3>
            <p>
              Log file information is automatically reported by your browser or mobile device each time you access the Service. 
              When you use our Service, our servers automatically record certain log file information. These server logs may 
              include anonymous information such as your web request, browser type, referring/exit pages and URLs, number of 
              clicks and how you interact with links on the Service, domain names, landing pages, pages viewed, and other such information.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Whenever you load a page from Mouva, your browser sends us info about itself and your 
              interactions with our Service.
            </div>

            <h3>(f) Device identifiers</h3>
            <p>
              When you access the Service on a device (including smart-phones or tablets), we may access, collect and/or 
              monitor one or more "device identifiers," such as a universally unique identifier ("UUID"). Device identifiers 
              are small data files that uniquely identify your mobile device. A device identifier may convey information to 
              us about how you use the Service.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Your phone or device sends us information about your usage.
            </div>

            <h3>(g) Location data</h3>
            <p>
              Mouva collects information in order to understand where its users are located for a number of reasons. It helps 
              Mouva to localize and personalize content, comply with local laws, undertake aggregated analytics, and estimate 
              the tax liability of Mouva. Mouva may collect your precise or approximate location by inferring your location 
              from your IP address or from your payment provider.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Mouva may collect and use your location data for personalization, analytics, and tax purposes.
            </div>

            <h3>(h) Content within your account</h3>
            <p>
              We receive content that you create within Mouva and media you upload, such as designs, images, documents, 
              videos, and metadata about your content.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Mouva collects the content you upload to and create in your account.
            </div>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect about you for the purposes set out in this policy:</p>
            <ul>
              <li><strong>Providing you with the Service:</strong> We use information about you to provide the Service to you. 
              This includes allowing you to log in to Mouva, operating and maintaining the Service, giving you access to your 
              designs and billing you for transactions that you make via the Service.</li>
              
              <li><strong>For data analytics:</strong> We use information about you to help us improve the Mouva Service and 
              our users' experience, including by monitoring aggregate metrics such as total number of visitors, traffic, and 
              demographic patterns.</li>
              
              <li><strong>For Service improvement:</strong> We may analyze your activity, content, media uploads and related 
              data in your account to provide and customize the Service. You can manage the use of your data for training AI 
              to improve our Service in the privacy settings.</li>
              
              <li><strong>Customizing the Service for you:</strong> We use and combine the information you provide us and 
              information about you that we collect automatically to make sure that your use of the Service is customized to 
              your needs.</li>
              
              <li><strong>To communicate with you about the Service:</strong> We use your contact information to get in touch 
              with you and to send communications about critical elements of the Service, such as technical issues, security 
              alerts or administrative matters.</li>
              
              <li><strong>Customer support:</strong> We use information about you and information about your interactions with 
              the Service to resolve technical issues you experience with the Service.</li>
              
              <li><strong>For safety, security, fraud and abuse measures:</strong> We may use information about you, your 
              activity, content, media uploads and related data in your account to prevent, detect, investigate and address 
              safety, security, fraud and abuse risks.</li>
              
              <li><strong>For legal compliance:</strong> Mouva will use or disclose your information where we reasonably 
              believe that such action is necessary to comply with the law, enforce our Terms of Service, or protect the 
              rights, property, or personal safety of Mouva, our users or others.</li>
            </ul>
            <p>
              <strong>We do NOT use your content to train AI models without explicit opt-in consent.</strong>
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Mouva uses information about you for different reasons, including to provide, 
              customize and improve the Service.
            </div>
          </section>

          <section className="legal-section">
            <h2>3. Sharing Your Information</h2>
            
            <h3>(a) How we share your information</h3>
            <p>
              We share your information with third-party service providers for the purpose of providing the Service to you, 
              to facilitate Mouva's legitimate interests or if you consent. These parties are vetted by us, and will only 
              be provided with access to your information as is reasonably necessary for the purpose that Mouva has engaged 
              that party. We require that such parties comply with applicable laws, and have security, privacy and data 
              retention policies consistent with our policies.
            </p>
            <p>Some of the parties with whom Mouva may share your personal information assist Mouva with functions such as:</p>
            <ul>
              <li>Billing and payment processing</li>
              <li>Customer support and customer management</li>
              <li>Email services</li>
              <li>Hosting and storage</li>
              <li>Data analytics</li>
              <li>Security and Service delivery</li>
              <li>AI processing services</li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> We might share some information about you with third-party service providers in 
              order to provide the Service to you.
            </div>

            <h3>(b) Sharing in connection with a merger, acquisition or reorganization</h3>
            <p>
              Mouva may also share, sell or transfer your information to third parties in connection with or contemplation 
              of any merger, acquisition, reorganization, financing, sale of assets, bankruptcy or insolvency event 
              involving Mouva. You will be notified via email and/or a notice on the Service if such a transaction takes 
              place and be given notice of any material changes to the way we handle your data under this policy.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> If we sell our business, any of the info which we've acquired about you may be part of the sale.
            </div>

            <h3>(c) Sharing with authorities</h3>
            <p>
              We access, preserve and share your information with regulators, law enforcement, police, intelligence sharing 
              and take down services and others where we have a good-faith belief that it is necessary to detect, prevent or 
              address fraud, breaches of our Terms of Service, harmful or illegal activity, to protect Mouva, you or others, 
              including as part of investigations or regulatory enquiries or to prevent death or imminent bodily harm.
            </p>
            <div className="legal-warning-box">
              <p>
                <strong>We actively cooperate with law enforcement</strong> in investigating violations of our prohibited 
                content policy, especially regarding terrorism, violent crime, and child exploitation. We may proactively 
                report suspected criminal activity to authorities.
              </p>
            </div>
            <div className="legal-summary">
              <strong>Summary:</strong> We may share data with authorities where we feel it is necessary, and we actively 
              cooperate with law enforcement on serious violations.
            </div>
          </section>

          <section className="legal-section">
            <h2>4. How We Transfer, Store and Protect Your Data</h2>
            <p>
              Your information collected through the Service will be stored and processed in secure data centers. Mouva 
              transfers information that we collect about you, including personal information, to affiliated entities and 
              to other third parties across borders and from your country or jurisdiction to other countries or jurisdictions 
              around the world. As a result, we may transfer information, including personal information, to a country and 
              jurisdiction that does not have the same data protection laws as your jurisdiction. However, we always take 
              steps to ensure that your information remains protected wherever it is stored and processed in accordance with 
              applicable laws.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> To run our Service, we may need to transfer your information to different countries 
              where our service providers are located.
            </div>
          </section>

          <section className="legal-section">
            <h2>5. Keeping Your Information Safe</h2>
            <p>
              Mouva cares about the security of your information, and uses appropriate safeguards to preserve the integrity 
              and security of all information collected through the Service. To protect your privacy and security, we take 
              reasonable steps (such as requesting a unique password) to verify your identity before granting you access to 
              your account. You are responsible for maintaining the secrecy of your unique password and account information, 
              and for controlling access to your email communications from Mouva, at all times.
            </p>
            <p>
              However, Mouva cannot ensure or warrant the security of any information you transmit to Mouva or guarantee 
              that information on the Service may not be accessed, disclosed, altered, or destroyed.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> We care about the safety of your data and have implemented industry recognized 
              measures to protect it, but unfortunately we can't guarantee that nothing bad will ever happen to it.
            </div>
          </section>

          <section className="legal-section">
            <h2>6. Your Choices About Your Information</h2>
            
            <h3>(a) You control your account information and settings</h3>
            <p>We provide choices about how we process your account information:</p>
            <ul>
              <li>You can manage the privacy preferences available to you by visiting your account settings page;</li>
              <li>You can request access, correction or deletion of the data Mouva holds on you by contacting 
              <a href="mailto:privacy@mouva.ai"> privacy@mouva.ai</a>;</li>
              <li>You can opt out of receiving marketing messages in your account settings or by clicking on the 
              "unsubscribe link" provided in such communications.</li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> You have control over your account settings. If you have any questions, you can 
              contact us directly at privacy@mouva.ai.
            </div>

            <h3>(b) Rights in respect of your Information</h3>
            <p>
              The laws of some countries grant particular rights in respect of personal information. Individuals in certain 
              countries, including the European Union, United Kingdom, and Brazil have the right to:
            </p>
            <ul>
              <li>Request access to their information;</li>
              <li>Request that we correct inaccuracies in their information;</li>
              <li>Request that their information be deleted or that we restrict access to it;</li>
              <li>Request a structured electronic version of their information; and</li>
              <li>Object to our use of their information.</li>
            </ul>
            <p>
              Should you wish to make a request in respect of your personal information please contact us at 
              <a href="mailto:privacy@mouva.ai"> privacy@mouva.ai</a>.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> You may have specific rights in relation to your information depending on where 
              you live.
            </div>
          </section>

          <section className="legal-section">
            <h2>7. How Long We Keep Your Information</h2>
            <p>
              Following termination or deactivation of your user account, Mouva will retain your profile information and 
              User Content for a commercially reasonable time, and for as long as we have a valid purpose to do so. In 
              particular, Mouva will retain your information for the purpose of complying with its legal and audit 
              obligations, and for backup and archival purposes.
            </p>
            <ul>
              <li><strong>Active Accounts:</strong> Data retained while account is active</li>
              <li><strong>Deleted Accounts:</strong> Data deleted within 30 days of account deletion request</li>
              <li><strong>Legal Holds:</strong> Data may be retained longer if required for legal proceedings or investigations</li>
              <li><strong>Prohibited Content Evidence:</strong> Evidence of violations may be retained for law enforcement cooperation</li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> We retain your profile information and user content for the purpose of providing 
              our Service to you and to comply with our legal and regulatory obligations.
            </div>
          </section>

          <section className="legal-section">
            <h2>8. Links to Other Websites and Services</h2>
            <p>
              We are not responsible for the practices employed by websites or services linked to or from the Service, 
              including the information or content contained therein. Please remember that when you use a link to go from 
              the Service to another website, our Privacy Policy does not apply to third-party websites or services. Your 
              browsing and interaction on any third-party website or service are subject to that third party's own rules 
              and policies.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> If we post a link to a third party website on Mouva, we can't control what happens 
              on the other end.
            </div>
          </section>

          <section className="legal-section">
            <h2>9. Additional Information for Users in Europe</h2>
            <p>
              This section of the policy applies to Mouva users that are located in the European Economic Area (EEA), 
              Switzerland or United Kingdom (UK). Mouva processes your personal data in accordance with European laws and 
              regulations, such as the General Data Protection Regulation (GDPR) and UK General Data Protection Regulation 
              (UK GDPR).
            </p>
            
            <h3>(a) Controller's details</h3>
            <p>
              For the purposes of the GDPR and UK GDPR, Mouva is the controller of your personal data.
            </p>

            <h3>(b) Legal bases for processing</h3>
            <p>
              If you are located in the EEA, Switzerland or UK, we need a lawful basis to collect, use and disclose your 
              personal data as a controller. Generally, Mouva will collect and use your information based on:
            </p>
            <ul>
              <li><strong>Contractual necessity:</strong> We need it to provide the Service to you and fulfil our obligations 
              to you under our Terms of Service.</li>
              <li><strong>Legitimate interests:</strong> It is necessary for our legitimate interests, for example, providing 
              a useful and customized Service.</li>
              <li><strong>Consent:</strong> You consent to us using your information in a certain way.</li>
              <li><strong>Legal obligations:</strong> It is necessary for compliance with our legal obligations.</li>
            </ul>
            <p>
              If you consented to our use of your information, you can withdraw that consent at any time by emailing 
              <a href="mailto:privacy@mouva.ai"> privacy@mouva.ai</a>.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> If you are accessing our Service from Europe, Mouva is the controller of your 
              personal data. We only process your data if we have a lawful basis.
            </div>
          </section>

          <section className="legal-section">
            <h2>10. Additional Information for Users in the United States</h2>
            <p>
              This section of the policy applies to Mouva users that are located in the United States. In certain U.S. 
              states, Mouva users have additional rights afforded to them under applicable state privacy laws, including 
              the California Consumer Privacy Act as amended by the California Privacy Rights Act, the Colorado Privacy Act, 
              the Connecticut Data Privacy Act, the Utah Consumer Privacy Act and the Virginia Consumer Data Protection Act.
            </p>
            
            <h3>Rights in respect of your personal information</h3>
            <p>These state privacy laws give resident users various rights with respect to the personal information we collect:</p>
            <ul>
              <li>Request access to the personal information Mouva has collected about you;</li>
              <li>Request that Mouva delete your personal information;</li>
              <li>Request that Mouva correct inaccurate personal information;</li>
              <li>Opt out from the "sale" of your personal information;</li>
              <li>Opt out of the "sharing" of your personal information for cross-context behavioral advertising;</li>
              <li>Appeal decisions where we deny your rights request.</li>
            </ul>
            <p>
              You may make a request by contacting us at <a href="mailto:privacy@mouva.ai">privacy@mouva.ai</a>.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> Certain U.S. state laws give resident users certain rights with respect to their 
              personal information.
            </div>
          </section>

          <section className="legal-section">
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time to reflect our current practice and ensure compliance with 
              applicable laws. When we post changes to this policy, we will revise the "Last Updated" date at the top of 
              this policy. If we make any material changes to the way we collect, use, store and/or share your personal 
              information, we will notify you on our website or by sending an email to the email address associated with 
              your Mouva account. We recommend that you check this page from time to time to inform yourself of any changes.
            </p>
            <div className="legal-summary">
              <strong>Summary:</strong> We won't make any major changes to our Privacy Policy without giving notice – but 
              it's still a good idea to visit this page every now and then.
            </div>
          </section>

          <section className="legal-section">
            <h2>12. How to Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or the Service, or wish to make a complaint please contact us at:</p>
            <ul className="legal-contact">
              <li><strong>Email:</strong> <a href="mailto:privacy@mouva.ai">privacy@mouva.ai</a></li>
              <li><strong>Report Abuse:</strong> <a href="mailto:abuse@mouva.ai">abuse@mouva.ai</a></li>
              <li><strong>Report Underage Users:</strong> <a href="mailto:privacy@mouva.ai">privacy@mouva.ai</a></li>
            </ul>
            <div className="legal-summary">
              <strong>Summary:</strong> Your privacy is important to us and we are happy to answer any questions you may have.
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
