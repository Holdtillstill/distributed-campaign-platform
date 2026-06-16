type ResumeVariantId = 'base' | 'signal' | 'editorial' | 'systems' | 'compact'

export function routeToResumeVariant(pathname: string): ResumeVariantId | null {
  if (/^\/resume\/?$/.test(pathname)) return 'base'
  const match = /^\/resume\/(base|signal|editorial|systems|compact)\/?$/.exec(pathname)
  return match ? (match[1] as ResumeVariantId) : null
}

const variantLinks: { id: ResumeVariantId; label: string }[] = [
  { id: 'base', label: 'Base CV' },
  { id: 'signal', label: 'Signal' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'systems', label: 'Systems' },
  { id: 'compact', label: 'Compact' },
]

const profile = {
  name: 'Bozhi Yin',
  title: 'DevOps Engineer',
  location: 'Chandler, AZ',
  mobility: 'Open to relocation nationwide',
  phone: '(480) 559-0080',
  email: 'yinbozhi@gmail.com',
  portfolio: 'https://bozhi.dev',
  github: 'https://github.com/Holdtillstill',
  summary:
    'DevOps Engineer with 8 years of experience designing, operating, securing, and modernizing AWS and GCP production platforms for high-throughput messaging, offer wallet, data, analytics, and internal product systems. Strong in Terraform, CloudFormation, CI/CD, ECS, EC2, serverless reliability, observability, security governance, disaster recovery, backup/restore, and cost optimization.',
}

const metrics = [
  { label: 'Experience', value: '8 years', detail: 'AWS and GCP production platforms' },
  { label: 'Peak traffic', value: '1,000+ TPS', detail: 'Subway Offer and Promotion wallet' },
  { label: 'Broadcast scale', value: '23M+', detail: 'weekly SMS, MMS, and RCS messages' },
  { label: 'Cost reduction', value: '75%+', detail: 'Apache Superset rebuild' },
]

const achievements = [
  'Owned operations for Subway Offer and Promotion wallet infrastructure supporting 1,000+ TPS peak traffic, 10M+ nightly offer ingestion, 99.99% uptime SLO/SLA, and p99 2.5s / p95 1.5s latency targets across ECS, ALB, RDS/Aurora PostgreSQL, S3, SQS, SNS, Firehose, Route 53, and Datadog.',
  'Modernized messaging infrastructure supporting 23M+ weekly SMS, MMS, and RCS messages to 11M+ subscribers, improving observability, broadcast resiliency, failover readiness, backup handling, and DR automation.',
  'Migrated 20+ drifted CloudFormation, console-managed, and legacy workloads into reusable Terraform modules and reusable GitHub Actions deployment workflows with monitored rollback paths across DynamoDB, CloudFront, Lambda, SNS, SQS, API Gateway, S3, and Kinesis Streams services.',
  'Rebuilt Apache Superset from an aging template into a maintainable EC2/ASG/RDS/Redis platform, reducing cost by 75%+ while improving multi-AZ resilience, observability, and MetaDB PITR/restore operations.',
  'Led AWS account governance improvements across sandbox, development, QA, and production using AWS Organizations, IAM Identity Center, SCPs, least-privilege policies, SSM, Secrets Manager, AWS Config, CloudTrail, WAF, and Shield.',
]

const makeProjects = [
  {
    year: '2026',
    title: 'Subway Offer and Promotion Wallet',
    subtitle: 'High-throughput AWS wallet operations',
    description:
      'Owned production readiness for ECS, ALB, Aurora PostgreSQL, S3, SQS, SNS, Firehose, Route 53, and Datadog infrastructure supporting 1,000+ TPS peak traffic, 10M+ nightly offer ingestion, 99.99% uptime SLO/SLA, and p99 2.5s / p95 1.5s latency targets.',
    tags: ['AWS', 'ECS', 'Aurora', 'SLO/SLA', 'Datadog'],
  },
  {
    year: '2026',
    title: 'Messaging Modernization',
    subtitle: 'Broadcast reliability and DR automation',
    description:
      'Modernized delivery infrastructure for 23M+ weekly SMS, MMS, and RCS messages across 11M+ subscribers with shared deduplication, GAE Task Queue workflows, SNS/SQS/Lambda/API Gateway services, Python automation, golden AMIs, service monitoring, and failover runbooks.',
    tags: ['Redis', 'ASG', 'Image Builder', 'GAE Task Queue', 'SNS', 'SQS', 'Lambda', 'Python', 'API Gateway', 'DR', 'Datadog'],
  },
  {
    year: '2025',
    title: 'Terraform Migration Program',
    subtitle: 'Legacy infrastructure moved into reproducible modules',
    description:
      'Migrated 20+ drifted CloudFormation, console-managed, and legacy workloads into reusable Terraform modules and reusable GitHub Actions workflows with monitored rollback paths across DynamoDB, CloudFront, Lambda, SNS, SQS, API Gateway, S3, and Kinesis Streams services.',
    tags: ['Terraform', 'Reusable workflows', 'Lambda', 'DynamoDB', 'Kinesis'],
  },
  {
    year: '2024',
    title: 'Superset Platform Rebuild',
    subtitle: 'Analytics platform modernization',
    description:
      'Rebuilt Apache Superset from an aging ECS Fargate template into a maintainable EC2/ASG/RDS/Redis platform, cutting cost by 75%+ while improving multi-AZ operation and restore readiness.',
    tags: ['Superset', 'Packer', 'Docker', 'RDS', 'Redis'],
  },
]

const skillGroups = [
  {
    label: 'Cloud and IaC',
    skills: ['AWS', 'GCP', 'Terraform', 'CloudFormation', 'Packer', 'GitHub Actions', 'Azure DevOps', 'Jenkins', 'AWS CodeDeploy'],
  },
  {
    label: 'AWS',
    skills: [
      'EC2',
      'ECS',
      'EKS',
      'ECR',
      'RDS/Aurora',
      'Redshift',
      'Lambda',
      'VPC',
      'IAM',
      'Organizations',
      'CloudTrail',
      'CloudWatch',
      'AWS Config',
      'S3',
      'SQS',
      'SNS',
      'DynamoDB',
      'EMR',
      'MWAA',
      'Kinesis Data Streams',
      'Firehose',
      'ElastiCache',
      'SSM',
      'ACM',
      'KMS',
      'WAF',
      'Shield',
      'GuardDuty',
    ],
  },
  {
    label: 'Containers, networking, and monitoring',
    skills: [
      'Docker',
      'Docker Compose',
      'Helm',
      'ASG',
      'ALB/ELB',
      'Route 53',
      'CloudFront',
      'VPC Peering',
      'NAT Gateway',
      'VPC endpoints',
      'Datadog',
      'CloudWatch',
      'Nagios',
      'New Relic',
    ],
  },
  {
    label: 'Operations and automation',
    skills: [
      'Disaster recovery planning',
      'Backup/restore',
      'Cost optimization',
      'Incident response',
      'RCA',
      'Change control',
      'Rollout/rollback planning',
      'Python',
      'Bash',
      'Linux',
      'Windows Server',
    ],
  },
  {
    label: 'Data and application platforms',
    skills: [
      'PostgreSQL',
      'MySQL',
      'MSSQL Server',
      'Redis',
      'Memcached',
      'DynamoDB',
      'Apache Airflow',
      'Apache Superset',
      'GCP App Engine',
      'Pub/Sub',
      'Datastore',
      'BigQuery',
      'Node.js',
      'Python',
      'Java',
      'PHP',
      '.NET',
      'Ruby on Rails',
    ],
  },
]

const makeSkills = [
  'AWS',
  'GCP',
  'Terraform',
  'CloudFormation',
  'GitHub Actions',
  'ECS',
  'EC2',
  'RDS/Aurora',
  'Lambda',
  'SQS',
  'SNS',
  'DynamoDB',
  'Docker',
  'Helm',
  'Datadog',
  'CloudWatch',
  'Python',
  'Bash',
  'PostgreSQL',
  'MSSQL',
  'Redis',
  'Apache Superset',
  'Incident response',
  'Disaster recovery',
]

const experience = [
  {
    label: 'Mobivity',
    role: 'DevOps Engineer',
    dates: 'Jun 2018 - Jun 2026',
    detail: 'Promoted from Software Engineering Intern, Jan 2018 - May 2018',
    bullets: [
      'Served as the primary DevOps and cloud infrastructure owner for business-critical AWS and GCP production platforms across messaging, wallet, data, analytics, and internal product systems, including over a year as the only DevOps engineer.',
      'Acted as the production escalation point for cloud architecture, IAM, networking, deployments, on-call incidents, database recovery issues, and reliability; wrote RCAs, remediation plans, and operational runbooks.',
      'Led technical evaluation panels for DevOps/DBA roles, mentored new hires, and partnered with engineering, data, IT, vendors, and third-party consultants on infrastructure initiatives and production support.',
      'Migrated 20+ microservices, serverless applications, and EC2/RDS workloads from drifted CloudFormation stacks, console-created resources, and undocumented manual processes into reusable Terraform modules and reusable GitHub Actions deployment workflows across DynamoDB, CloudFront, Lambda, SNS, SQS, API Gateway, S3, and Kinesis Streams services.',
      'Built reusable Terraform modules and shared workflows for Lambda, EventBridge, SQS, SNS, DynamoDB, API Gateway, CloudFront, ECS, EC2, RDS, Datadog monitors, dashboards, and deployment automation.',
      'Built blue/green deployments for .NET web applications with AWS CodeDeploy, ASG health checks, target group validation, rollback plans, and after-hours change windows.',
      'Built AWS account hygiene and cost/risk drift checks across 6 AWS accounts to surface unused resources, missing standards, and remediation opportunities.',
      'Tuned DynamoDB throughput, Lambda timeout/concurrency, ECS task CPU/memory, ASG scaling, and cloud spend based on CloudWatch, Datadog, usage patterns, Reserved Instances, Savings Plans, Spot Instances, and right-sizing.',
    ],
  },
  {
    label: 'Subway Offer and Promotion Wallet Platform',
    role: 'Production platform operations',
    dates: 'High-throughput offer and promotion wallet',
    bullets: [
      'Operated CloudFormation-managed AWS infrastructure for the Offer and Promotion wallet platform for Subway, supporting API, proxy, admin, ingestion, migration, and scheduled job workloads on ECS on EC2.',
      'Supported production flows across public ALB host-based routing, private ECS services, RDS/Aurora PostgreSQL, S3 input buckets, SQS ingestion queues, SNS notifications, Firehose delivery, Route 53 private DNS, and Datadog monitoring, with 99.99% uptime SLO/SLA and p99 2.5s / p95 1.5s latency targets.',
      'Managed capacity and operational readiness for customer validation windows, including production/staging scaling, rollback planning, after-hours deployment support, incident triage, and coordination with Subway testing.',
      'Produced implementation-ready architecture recommendations for hardening the legacy CloudFormation stack, covering ECS target tracking, SQS backlog scaling, three-AZ placement, capacity providers, WAF/Shield readiness, blue/green validation, and Route 53/RDS/S3 disaster recovery patterns.',
    ],
  },
  {
    label: 'Messaging Platform Modernization',
    role: 'Broadcast reliability and DR',
    dates: '23M+ weekly messages',
    bullets: [
      'Managed delivery infrastructure for 23M+ weekly SMS, MMS, and RCS messages across 11M+ subscribers, including Subway and Sonic campaigns exceeding 10M messages per day during peak broadcasts.',
      'Stabilized manually maintained Kannel SMS gateways by adding service monitoring, log rotation, maintenance jobs, Datadog infrastructure metrics, and custom checks for sent, failed, discarded, and per-shortcode volume.',
      'Re-architected two independent broadcast nodes and queues into a single-queue, multi-consumer model with ElastiCache Redis for shared deduplication, reducing single-node failure impact and duplicate-message risk.',
      'Converted messaging nodes into stateless ASG instances with golden AMIs, lifecycle hooks for S3 log archival, and automated patch validation through EC2 Image Builder and AWSTOE against a simulated SMSC.',
      'Improved DR readiness with CloudFormation recovery templates, cross-region Redis replication design, failover runbooks, and backup/log archival patterns targeting sub-30-minute RTO and sub-5-minute RPO.',
    ],
  },
  {
    label: 'Reliability, Security, and Data Platforms',
    role: 'Observability, governance, and data operations',
    dates: 'AWS, GCP, data, and internal systems',
    bullets: [
      'Designed fault-tolerant Lambda workflows with SQS DLQs, redrive paths, and exponential backoff to reduce silent failures when downstream systems were unavailable or slow.',
      'Diagnosed and resolved Redshift serializable isolation violations and leader-node CPU saturation caused by concurrent Airflow DAG and Lambda operations.',
      'Migrated critical monitoring from Nagios to Datadog, building dashboards, service checks, custom metrics, and alerts across EC2, ECS, RDS, Redis, ALB, Docker, Gunicorn, Celery, and application-level metrics.',
      'Led migration from legacy AWS accounts to a structured multi-account model using AWS Organizations, IAM Identity Center, least-privilege permission sets, SCPs, SSM Parameter Store, Secrets Manager, AWS Config, and CloudTrail.',
      'Scoped down IAM, KMS, S3 bucket, SNS topic, and Secrets Manager policies; audited GitHub repositories for hardcoded secrets; locked down S3 public access; and replaced SSH key workflows with SSM Session Manager.',
      'Designed multi-tier VPC architectures with public, private, database, and tools subnets, NAT gateways, VPC endpoints, peering, security groups, Route 53 private hosted zones, ALB/CloudFront ingress, and SSM Session Manager access.',
      'Rebuilt Apache Superset from an aging ECS Fargate partner template to Terraform, Packer, Docker Compose, EC2 ASG, ALB, RDS, and ElastiCache Redis, cutting cost by 75%+ and improving multi-AZ operation.',
      'Investigated and patched Superset query loops and Redshift connection storms; implemented a Redis-backed leader lock so only one container sends scheduled reports and implemented MetaDB PITR/lower-environment restore automation.',
      'Maintained ETL and streaming pipelines using EMR, MWAA, Lambda, Kinesis Data Streams, Firehose, and legacy Data Pipeline migration paths; reduced spend through Reserved Instances, Savings Plans, Spot Instances, right-sizing, and reproducible environment teardown.',
      'Stepped in as interim DBA during staffing gaps, resolving MSSQL Server restore and log shipping failures, coordinating with consultants for optimization, and investigating undocumented issues through logs, tickets, and historical Slack context.',
      'Led controlled decommissioning and migration of legacy products and supporting infrastructure across SmartReceipt, Belly Loyalty, Subway Wallet, messaging, and other retired platforms; migrated static hosting from Media Temple to S3/CloudFront and consolidated EC2/nginx redirects into HubSpot-native routing.',
    ],
  },
]

const certifications = [
  'AWS Certified Solutions Architect - Professional',
  'AWS Certified SysOps Administrator - Associate',
]

const education = [
  'Arizona State University - W. P. Carey School of Business',
  'Bachelor of Science, Computer Information Systems',
  'Bachelor of Science, Supply Chain Management',
]

function ResumeVariantNav({ active, tone = 'light' }: { active: ResumeVariantId; tone?: 'light' | 'dark' }) {
  return (
    <nav className={`resume-variant-nav resume-variant-nav-${tone}`} aria-label="Resume versions">
      {variantLinks.map((variant) => (
        <a className={variant.id === active ? 'active' : ''} href={`/resume/${variant.id}`} key={variant.id}>
          {variant.label}
        </a>
      ))}
    </nav>
  )
}

function ContactLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className={`resume-contact-links resume-contact-links-${tone}`}>
      <a href={`mailto:${profile.email}`}>{profile.email}</a>
      <a href={profile.portfolio}>bozhi.dev</a>
      <a href={profile.github}>GitHub</a>
      <span>{profile.phone}</span>
    </div>
  )
}

function MetricStrip({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`resume-metrics ${compact ? 'resume-metrics-compact' : ''}`} aria-label="Resume metrics">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </div>
      ))}
    </section>
  )
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="resume-section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  )
}

function AchievementList({ mode = 'list' }: { mode?: 'list' | 'proof' | 'numbered' }) {
  return (
    <section className={`resume-achievements resume-achievements-${mode}`} aria-label="Key achievements">
      <SectionHeader eyebrow="Impact" title="Key achievements" />
      <div>
        {achievements.map((achievement, index) => (
          <article key={achievement}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{achievement}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function SkillsMatrix({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`resume-skills ${compact ? 'resume-skills-compact' : ''}`} aria-label="Technical skills">
      <SectionHeader eyebrow="Stack" title="Technical skills" />
      <div className="resume-skill-groups">
        {skillGroups.map((group) => (
          <article key={group.label}>
            <h3>{group.label}</h3>
            <div>
              {group.skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function getExperienceHighlights(item: (typeof experience)[number], selected = false) {
  if (selected) {
    return item.label === 'Messaging Platform Modernization'
      ? [...item.bullets.slice(0, 3), item.bullets[4]]
      : item.bullets.slice(0, item.label === 'Mobivity' ? 4 : 3)
  }

  return item.bullets
}

function getBaseExperienceHighlights(item: (typeof experience)[number]) {
  return item.label === 'Messaging Platform Modernization'
    ? [...item.bullets.slice(0, 2), item.bullets[4]]
    : item.bullets.slice(0, item.label === 'Mobivity' ? 4 : 3)
}

function ExperienceTimeline({ dense = false, selected = false }: { dense?: boolean; selected?: boolean }) {
  const [employer, ...initiatives] = experience
  const renderExperienceItem = (item: (typeof experience)[number], className = '') => {
    const bullets = getExperienceHighlights(item, selected)

    return (
      <article className={className} key={item.label}>
        <div className="resume-experience-heading">
          <div>
            <span>{item.label}</span>
            <h3>{item.role}</h3>
          </div>
          <strong>{item.dates}</strong>
        </div>
        {'detail' in item ? <p className="resume-role-detail">{item.detail}</p> : null}
        <ul>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </article>
    )
  }

  return (
    <section className={`resume-experience ${dense ? 'resume-experience-dense' : ''}`} aria-label="Professional experience">
      <SectionHeader eyebrow="Experience" title="Professional experience" />
      <div className="resume-experience-list">
        {employer ? renderExperienceItem(employer, 'resume-experience-employer') : null}
        {initiatives.length > 0 ? (
          <p className="resume-experience-group-label">Notable platform work at Mobivity</p>
        ) : null}
        {initiatives.map((item) => renderExperienceItem(item, 'resume-experience-initiative'))}
      </div>
    </section>
  )
}

function Credentials() {
  return (
    <section className="resume-credentials" aria-label="Certifications and education">
      <article>
        <SectionHeader eyebrow="Credentials" title="Certifications" />
        {certifications.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </article>
      <article>
        <SectionHeader eyebrow="Education" title="Arizona State University" />
        {education.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </article>
    </section>
  )
}

function ResumeIntro({
  active,
  kicker,
  heading = profile.name,
  tone = 'dark',
}: {
  active: ResumeVariantId
  kicker: string
  heading?: string
  tone?: 'light' | 'dark'
}) {
  return (
    <header className={`resume-hero resume-hero-${tone}`}>
      <div className="resume-hero-overlay">
        <div className="resume-hero-top">
          <a href="/" className="resume-home-link">
            Bozhi Yin
          </a>
          <ResumeVariantNav active={active} tone={tone} />
        </div>
        <div className="resume-hero-copy">
          <p>{kicker}</p>
          <h1>{heading}</h1>
          <strong>{profile.title}</strong>
          <span>
            {profile.location} / {profile.mobility}
          </span>
          <p>{profile.summary}</p>
          <ContactLinks tone={tone} />
        </div>
      </div>
    </header>
  )
}

function BaseResume() {
  const [employer, ...initiatives] = experience
  const renderMakeExperienceRow = (job: (typeof experience)[number], className = '') => {
    const highlights = getBaseExperienceHighlights(job)

    return (
      <article className={`make-experience-row ${className}`} key={job.label}>
        <div>
          <h3>{job.label}</h3>
          <p>{job.role}</p>
          <span>{job.dates}</span>
        </div>
        <ul>
          {highlights.map((highlight) => (
            <li key={highlight}>
              <span>-</span>
              <p>{highlight}</p>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  return (
    <main className="resume-site make-resume">
      <header className="make-nav">
        <nav className="make-shell" aria-label="Portfolio navigation">
          <a className="make-brand" href="#make-hero">
            {profile.name}
          </a>
          <div className="make-nav-links">
            <a href="#make-work">Work</a>
            <a href="#make-experience">Resume</a>
            <a href="#make-contact">Contact</a>
            <a className="make-hire-link" href={`mailto:${profile.email}`}>
              Hire me
            </a>
          </div>
        </nav>
      </header>

      <section className="make-shell make-hero" id="make-hero">
        <div className="make-hero-copy">
          <p className="make-kicker">DevOps engineer / {profile.location}</p>
          <h1 aria-label="Building platforms that last.">
            Building
            <br />
            <em>platforms</em>
            <br />
            that last.
          </h1>
          <p>
            8 years operating AWS and GCP production platforms for high-throughput messaging, offer wallet, data,
            analytics, and internal systems. I turn legacy risk into Terraform, observability, runbooks, DR, and
            reliable deployment paths.
          </p>
          <div className="make-actions">
            <a className="make-primary-action" href="#make-work">
              See project work -&gt;
            </a>
            <a className="make-secondary-action" href="#make-experience">
              View resume
            </a>
          </div>
        </div>

        <aside className="make-hero-aside" aria-label="Resume quick facts">
          <div>
            <span>Currently</span>
            <p>{profile.title}</p>
          </div>
          <div>
            <span>Production scale</span>
            <p>1,000+ TPS wallet traffic</p>
            <p>23M+ weekly messages</p>
          </div>
          <div>
            <span>Education</span>
            <p>Arizona State University</p>
            <p>Computer Information Systems / Supply Chain</p>
          </div>
          <div>
            <span>Availability</span>
            <p className="make-availability">
              <i />
              {profile.mobility}
            </p>
          </div>
        </aside>
      </section>

      <section className="make-shell make-section" id="make-work">
        <div className="make-section-heading">
          <h2>Selected Work</h2>
          <span>0{makeProjects.length} projects</span>
        </div>
        <div className="make-project-grid">
          {makeProjects.map((project, index) => (
            <article className="make-project-card" key={project.title}>
              <div className="make-project-meta">
                <span>
                  {String(index + 1).padStart(2, '0')} / {project.year}
                </span>
                <span>Case note</span>
              </div>
              <h3>{project.title}</h3>
              <p className="make-project-subtitle">{project.subtitle}</p>
              <p>{project.description}</p>
              <div className="make-tags">
                {project.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="make-shell make-section" id="make-experience">
        <div className="make-section-heading">
          <h2>Experience</h2>
          <a href={`mailto:${profile.email}`}>Request PDF resume -&gt;</a>
        </div>
        <div className="make-experience-list">
          {employer ? renderMakeExperienceRow(employer, 'make-experience-employer') : null}
          {initiatives.length > 0 ? (
            <p className="make-experience-group-label">Notable platform work at Mobivity</p>
          ) : null}
          {initiatives.map((job) => renderMakeExperienceRow(job, 'make-experience-initiative'))}
        </div>
        <section className="make-skills" aria-label="Skills and tools">
          <p>Skills and tools</p>
          <div>
            {makeSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
      </section>

      <section className="make-shell make-credentials" aria-label="Credentials">
        <article>
          <h2>Certifications</h2>
          {certifications.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </article>
        <article>
          <h2>Education</h2>
          {education.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </article>
      </section>

      <section className="make-shell make-contact" id="make-contact">
        <div>
          <p className="make-kicker">Get in touch</p>
          <h2>
            Let's build
            <br />
            something
            <br />
            <em>reliable.</em>
          </h2>
          <p>
            Open to cloud, DevOps, infrastructure, and platform engineering roles where production ownership, automation,
            and operational clarity matter.
          </p>
          <a className="make-primary-action" href={`mailto:${profile.email}`}>
            {profile.email} -&gt;
          </a>
        </div>
        <div className="make-contact-links">
          <a href={profile.github}>GitHub / Holdtillstill -&gt;</a>
          <a href={profile.portfolio}>Demo apps / bozhi.dev -&gt;</a>
          <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`}>{profile.phone}</a>
        </div>
      </section>

      <footer className="make-shell make-footer">
        <span>{profile.name}</span>
        <span>2026</span>
      </footer>
    </main>
  )
}

function SignalResume() {
  return (
    <main className="resume-site resume-signal">
      <ResumeIntro
        active="signal"
        kicker="Cloud operations resume"
        heading="Reliability, migration, and production ownership at scale."
      />
      <MetricStrip />
      <section className="resume-signal-board" aria-label="Operations focus">
        {[
          ['Platform ownership', 'AWS and GCP systems across messaging, wallet, data, analytics, and internal products.'],
          ['Reliability posture', 'Runbooks, RCAs, rollback paths, observability, backup handling, and DR automation.'],
          ['Security governance', 'IAM Identity Center, SCPs, AWS Config, CloudTrail, SSM, Secrets Manager, WAF, and Shield.'],
          ['Cost discipline', 'Reserved Instances, Savings Plans, Spot Instances, right-sizing, and reproducible teardown.'],
        ].map(([title, copy]) => (
          <article key={title}>
            <span>{title}</span>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <div className="resume-signal-grid">
        <AchievementList mode="proof" />
        <ExperienceTimeline selected />
      </div>
      <SkillsMatrix compact />
      <Credentials />
    </main>
  )
}

function EditorialResume() {
  return (
    <main className="resume-site resume-editorial">
      <header className="resume-editorial-header">
        <div>
          <a href="/" className="resume-home-link">
            Bozhi Yin
          </a>
          <ResumeVariantNav active="editorial" />
        </div>
        <section>
          <p>DevOps Engineer</p>
          <h1>Turning operational risk into infrastructure standards.</h1>
          <p>{profile.summary}</p>
          <ContactLinks />
        </section>
      </header>
      <MetricStrip />
      <section className="resume-editorial-feature" aria-label="Career emphasis">
        <div>
          <span>Trusted production owner</span>
          <p>
            Sole DevOps owner for extended periods and production escalation point for cloud architecture, IAM,
            networking, deployments, on-call incidents, and database recovery issues.
          </p>
        </div>
        <img src="/resume-assets/cloud-ops-hero.png" alt="Cloud operations workspace" />
      </section>
      <AchievementList mode="numbered" />
      <ExperienceTimeline selected />
      <div className="resume-editorial-lower">
        <SkillsMatrix compact />
        <Credentials />
      </div>
    </main>
  )
}

function SystemsResume() {
  return (
    <main className="resume-site resume-systems">
      <aside className="resume-systems-rail">
        <a href="/" className="resume-home-link">
          Bozhi Yin
        </a>
        <ResumeVariantNav active="systems" tone="dark" />
        <ContactLinks tone="dark" />
      </aside>
      <section className="resume-systems-main">
        <header>
          <p>Infrastructure systems map</p>
          <h1>{profile.title}</h1>
          <span>
            {profile.location} / {profile.mobility}
          </span>
          <p>{profile.summary}</p>
        </header>
        <MetricStrip compact />
        <section className="resume-systems-map" aria-label="Systems highlights">
          {achievements.map((achievement, index) => (
            <article key={achievement}>
              <span>0{index + 1}</span>
              <p>{achievement}</p>
            </article>
          ))}
        </section>
        <SkillsMatrix compact />
        <ExperienceTimeline selected />
        <Credentials />
      </section>
    </main>
  )
}

function CompactResume() {
  return (
    <main className="resume-site resume-compact">
      <header className="resume-compact-header">
        <div>
          <a href="/" className="resume-home-link">
            {profile.name}
          </a>
          <h1>{profile.title}</h1>
          <p>
            {profile.location} / {profile.mobility} / {profile.phone} / {profile.email}
          </p>
        </div>
        <ResumeVariantNav active="compact" />
      </header>
      <section className="resume-compact-summary">
        <p>{profile.summary}</p>
        <MetricStrip compact />
      </section>
      <AchievementList />
      <SkillsMatrix compact />
      <ExperienceTimeline dense />
      <Credentials />
    </main>
  )
}

export function PortfolioResume({ variant }: { variant: ResumeVariantId }) {
  if (variant === 'signal') return <SignalResume />
  if (variant === 'editorial') return <EditorialResume />
  if (variant === 'systems') return <SystemsResume />
  if (variant === 'compact') return <CompactResume />
  return <BaseResume />
}
