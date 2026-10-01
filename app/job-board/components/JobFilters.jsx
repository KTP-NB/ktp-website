'use client';

import SelectMenu from '@/app/components/SelectMenu';
import {
  CAREER_CATEGORIES,
  CAREER_CATEGORY_GROUPS,
  JOBS_PER_PAGE_OPTIONS,
} from '@/lib/job-board/constants';

export default function JobFilters({ query, filters, perPage, onQueryChange, onPerPageChange }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <input
        value={query.search}
        onChange={(event) => onQueryChange({ search: event.target.value })}
        placeholder="Search title, company, keywords"
        className="min-w-0 rounded-xl border border-white/15 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none placeholder:text-blue-100/40 focus:border-blue-200/60 sm:col-span-2 lg:col-span-3 xl:col-span-6"
      />
      <Select
        label="Category"
        value={query.category}
        onChange={(value) => onQueryChange({ category: value })}
        options={mergeOptions(CAREER_CATEGORIES, filters.categories)}
        groups={CAREER_CATEGORY_GROUPS}
      />
      <Select label="Role Type" value={query.employmentType} onChange={(value) => onQueryChange({ employmentType: value })} options={filters.employmentTypes || []} />
      <Select
        label="H1B"
        value={query.h1bStatus}
        onChange={(value) => onQueryChange({ h1bStatus: value })}
        options={mergeOptions(['h1b_friendly', 'explicit_h1b_sponsor', 'likely_h1b_sponsor'], filters.h1bStatuses)}
      />
      <Select label="Workplace" value={query.workplaceType} onChange={(value) => onQueryChange({ workplaceType: value })} options={filters.workplaceTypes || []} />
      <Select label="Company" value={query.company} onChange={(value) => onQueryChange({ company: value })} options={filters.companies || []} searchable />
      <SelectMenu
        label="Jobs per page"
        value={String(perPage)}
        onChange={(value) => onPerPageChange(Number(value))}
        options={JOBS_PER_PAGE_OPTIONS.map((option) => ({ value: String(option), label: `${option} per page` }))}
        className="min-w-0"
        align="right"
      />
      <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-slate-950/30 px-4 py-3 text-sm font-bold text-blue-50 sm:col-span-2 lg:col-span-3 xl:col-span-6">
        <input
          type="checkbox"
          checked={query.postedToday}
          onChange={(event) => onQueryChange({ postedToday: event.target.checked })}
        />
        Posted today
      </label>
    </div>
  );
}

function Select({ label, value, onChange, options, groups, searchable = false }) {
  const optionSet = new Set(options);
  const groupedOptions = groups
    ?.map((group) => ({
      ...group,
      categories: group.categories.filter((category) => optionSet.has(category)),
    }))
    .filter((group) => group.categories.length);
  const groupedValues = new Set(groupedOptions?.flatMap((group) => group.categories) || []);
  const ungroupedOptions = options.filter((option) => !groupedValues.has(option));

  const orderedOptions = [
    ...(groupedOptions?.flatMap((group) => group.categories) || []),
    ...ungroupedOptions,
  ];

  return <SelectMenu
    label={label}
    placeholder={label}
    value={value}
    onChange={onChange}
    searchable={searchable}
    searchPlaceholder={`Search ${label.toLowerCase()}`}
    align={label === 'Company' ? 'right' : 'left'}
    options={[
      { value: '', label: `All ${label.toLowerCase()}` },
      ...orderedOptions.map((option) => ({ value: option, label: formatOption(option) })),
    ]}
    className="min-w-0"
  />;
}

function formatOption(value) {
  const labels = {
    h1b_friendly: 'H1B Friendly',
    explicit_h1b_sponsor: 'Explicit H1B',
    likely_h1b_sponsor: 'Likely H1B',
    new_grad_full_time: 'New Grad / Full-Time',
  };
  if (labels[value]) return labels[value];
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mergeOptions(defaultOptions, availableOptions = []) {
  return [...new Set([...(defaultOptions || []), ...(availableOptions || [])].filter(Boolean))];
}
