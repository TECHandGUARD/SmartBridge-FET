-- Recovered verbatim from the existing production migration history.
create table if not exists public.tech_guard_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text not null,
  featured boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tech_guard_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  url text,
  featured boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tech_guard_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  service text,
  message text not null,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

alter table public.tech_guard_services enable row level security;
alter table public.tech_guard_projects enable row level security;
alter table public.tech_guard_leads enable row level security;

create policy "public can read services" on public.tech_guard_services for select to anon, authenticated using (true);
create policy "public can read projects" on public.tech_guard_projects for select to anon, authenticated using (true);
create policy "public can submit leads" on public.tech_guard_leads for insert to anon, authenticated with check (true);

insert into public.tech_guard_services (name, slug, description, sort_order) values
('Web Development','web-development','Fast, modern websites engineered around your goals and your customers.',1),
('E-commerce','e-commerce','Conversion-focused online stores with clean journeys, payments and scalable foundations.',2),
('Custom Web Apps','custom-web-apps','Purpose-built platforms that turn complex business processes into simple digital workflows.',3),
('Cloud & Maintenance','cloud-maintenance','Reliable hosting, monitoring, maintenance and technical support for growing systems.',4),
('IT Support & Consulting','it-support-consulting','Practical technology guidance, troubleshooting and digital infrastructure support.',5)
on conflict (slug) do nothing;

insert into public.tech_guard_projects (name, category, description, sort_order) values
('SmartBridge FET','Education Technology','A digital platform connecting learners with tutoring, opportunities and university pathways.',1),
('MELL','E-commerce & Growth','A growth-focused digital experience supporting product discovery and an affiliate ecosystem.',2),
('Geometry SuperLab','Educational Technology','Interactive geometry learning tools designed for classroom and independent learning.',3)
on conflict do nothing;
