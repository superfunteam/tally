import { motion } from 'framer-motion';
import type { TabType } from '../../types';

interface BottomTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  receiptCount: number;
  statementCount: number;
}

export function BottomTabs({
  activeTab,
  onTabChange,
  receiptCount,
  statementCount,
}: BottomTabsProps) {
  const tabs: { id: TabType; label: string; icon: string; count: number }[] = [
    { id: 'receipts', label: 'Receipts', icon: 'receipt_long', count: receiptCount },
    { id: 'statements', label: 'Statements', icon: 'account_balance', count: statementCount },
  ];

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-item ${activeTab === tab.id ? 'tab-item-active' : ''}`}
        >
          <div className="relative">
            <span className="material-icons-outlined text-2xl">{tab.icon}</span>
            {tab.count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-2 bg-primary-600 text-white text-xs
                           rounded-full min-w-[18px] h-[18px] flex items-center justify-center
                           font-medium px-1"
              >
                {tab.count > 99 ? '99+' : tab.count}
              </motion.span>
            )}
          </div>
          <span className="text-xs font-medium">{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-full"
            />
          )}
        </button>
      ))}
    </nav>
  );
}
