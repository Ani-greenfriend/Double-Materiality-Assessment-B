import { TopicsIcon } from './icons';

export default function TopicsTab() {
  return (
    <div>
      <h2 className="text-[24px] font-bold flex items-center gap-3 mb-1">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7C9BFF, #4C6FFF)' }}>
          <TopicsIcon size={19} />
        </span>
        Topics
      </h2>
      <p className="text-[12px] text-text-secondary mb-5">The master IRO library — independent of any single cycle.</p>
      <div className="bg-surface rounded-2xl p-10 text-center text-text-secondary text-[13px]">
        Not built yet — the topic library admin (manual add, CSV upload, sign-off, filtered by ESRS version) is next in the build order.
      </div>
    </div>
  );
}
