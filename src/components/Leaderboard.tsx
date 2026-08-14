import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  username: string;
  high_score: number;
}

interface LeaderboardProps {
  refreshKey: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ refreshKey }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('username, high_score')
      .order('high_score', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!cancelled) {
          setEntries(data ?? []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Card className="w-full border-amber-400 shadow-lg" style={{ backgroundColor: '#383838' }}>
      <CardHeader>
        <CardTitle style={{ color: '#f5f5f4' }}>🏆 Top Treasure Hunters</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm" style={{ color: '#d4d4d4' }}>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm" style={{ color: '#d4d4d4' }}>No scores yet — be the first!</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {entries.map((entry, index) => (
              <li
                key={`${entry.username}-${index}`}
                className="flex items-center justify-between"
                style={{ color: '#f5f5f4' }}
              >
                <span>
                  {MEDALS[index]} {entry.username}
                </span>
                <span className="font-medium">${entry.high_score}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
