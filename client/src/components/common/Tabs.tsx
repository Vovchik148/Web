import { useState } from 'react';
import { TabGroup, TabList, TabPanel, TabPanels, Tab } from '@headlessui/react';

// Компонент табів (Headless UI): доступний з клавіатури (стрілки), aria-атрибутs
// встановлюються автоматично. Використовується на детальній сторінці товару.
export default function Tabs({ tabs }: { tabs: Array<{ label: string; content: React.ReactNode }> }) {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <TabGroup selectedIndex={tabIndex} onChange={setTabIndex}>
      <TabList className="mb-4 flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {tabs.map((tab) => (
          <Tab
            key={tab.label}
            className="flex-1 rounded-md px-3 py-2 text-sm font-medium data-selected:bg-white data-selected:text-gray-900 data-selected:shadow dark:data-selected:bg-gray-900 dark:data-selected:text-gray-100"
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tab, i) => (
          <TabPanel key={i} className={i === tabIndex ? 'animate-fade-slide' : ''}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
