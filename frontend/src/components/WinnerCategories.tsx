'use client';

import { Trophy, Target, Scale } from 'lucide-react';
import { WINNER_CATEGORIES } from '@/lib/constants';

export function WinnerCategories() {
  const categories = [
    {
      ...WINNER_CATEGORIES.CONVICTION_WEIGHTED,
      icon: Trophy,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
      border: 'border-primary-500/30',
    },
    {
      ...WINNER_CATEGORIES.RAW_ACCURACY,
      icon: Target,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    {
      ...WINNER_CATEGORIES.CALIBRATION,
      icon: Scale,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
    },
  ];

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Winner Categories</h2>
      <p className="text-sm text-dark-400 mb-6">
        Each round produces three distinct winners, rewarding different forms of predictive skill.
      </p>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <div
            key={index}
            className={`${category.bg} ${category.border} border rounded-lg p-4`}
          >
            <div className="flex items-start gap-3">
              <div className={`${category.color} mt-0.5`}>
                <category.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${category.color}`}>
                    {category.name}
                  </h3>
                  <span className="text-sm font-mono text-dark-300">
                    {category.share}
                  </span>
                </div>
                <p className="text-sm text-dark-400 mt-1">
                  {category.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-dark-800/50 rounded-lg border border-dark-700">
        <p className="text-xs text-dark-400">
          If a participant qualifies for multiple categories, they receive the highest-priority award 
          and the next eligible participant is promoted. Each round always resolves to three distinct winners.
        </p>
      </div>
    </div>
  );
}
