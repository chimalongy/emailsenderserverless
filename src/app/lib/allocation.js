/**
 * Programmatically allocates prospects to active email accounts based on their daily capacities,
 * starting from the last used email and wrapping around sequentially.
 *
 * @param {string[]} prospects - Array of scraped prospect emails to allocate.
 * @param {Object[]} emailAccounts - Array of email account objects from the DB.
 * @param {string} lastAllocatedEmail - The email of the last allocated account.
 * @param {number} lastAllocatedEmailRemainder - The remainder capacity of the last allocated account.
 * @param {boolean} [useFullCapacity=false] - When true, each account's capacity is its full
 *   daily_limit (ignoring sent_today). Use this for auto-outbound tasks that are scheduled on
 *   future dates when the daily counter will have reset. When false (default), capacity is
 *   daily_limit minus sent_today, which is correct for same-day manual sends.
 * @returns {{
 *   allocations: Array<{ account_id: string, allocated_emails: number }>,
 *   last_allocated_email: string,
 *   last_allocated_email_remainder: number
 * }}
 */
export function allocateEmails(prospects, emailAccounts, lastAllocatedEmail, lastAllocatedEmailRemainder, useFullCapacity = false) {
  if (!prospects || prospects.length === 0 || !emailAccounts || emailAccounts.length === 0) {
    return {
      allocations: [],
      last_allocated_email: lastAllocatedEmail || "",
      last_allocated_email_remainder: lastAllocatedEmailRemainder || 0
    };
  }

  // 1. Sort accounts by created_at ascending (the order they were added to the database)
  const sortedAccounts = [...emailAccounts].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  const N = sortedAccounts.length;

  // Calculate capacities for each sorted account.
  // useFullCapacity=true  → use daily_limit directly (auto-outbound: tasks run on future dates
  //                          when the daily counter has already reset to zero).
  // useFullCapacity=false → use daily_limit - sent_today (manual same-day send: some emails
  //                          may already have been sent today).
  const capacities = sortedAccounts.map(acc => {
    const dailyLimit = acc.daily_limit || 0;
    if (useFullCapacity) {
      return dailyLimit;
    }
    const sentToday = acc.sent_today || 0;
    return Math.max(0, dailyLimit - sentToday);
  });

  // 2. Determine where to start allocation
  let startIdx = -1;
  if (lastAllocatedEmail) {
    startIdx = sortedAccounts.findIndex(acc => acc.email.toLowerCase() === lastAllocatedEmail.toLowerCase());
  }

  const allocationsMap = {}; // account_id -> Array of allocated email strings
  sortedAccounts.forEach(acc => {
    allocationsMap[acc.id] = [];
  });

  let remainingProspects = prospects.length;
  let currentIdx = 0;
  let isFirstStep = false;

  if (startIdx !== -1) {
    if (lastAllocatedEmailRemainder > 0) {
      currentIdx = startIdx;
      isFirstStep = true;
    } else {
      // Start at the next account
      currentIdx = (startIdx + 1) % N;
    }
  } else {
    // Default to the first account in sorted order
    currentIdx = 0;
  }

  let lastUsedIdx = currentIdx;
  let lastUsedRemainder = 0;

  // Track which accounts are fully exhausted in this run.
  let exhaustedCount = 0;
  const isExhausted = new Array(N).fill(false);

  // Mark accounts with 0 capacity as exhausted
  for (let i = 0; i < N; i++) {
    if (capacities[i] <= 0) {
      isExhausted[i] = true;
      exhaustedCount++;
    }
  }

  while (remainingProspects > 0 && exhaustedCount < N) {
    const acc = sortedAccounts[currentIdx];
    const maxCapacity = capacities[currentIdx];
    const currentAllocatedCount = allocationsMap[acc.id].length;
    
    // Determine target capacity for this step
    let targetCapacity = maxCapacity;
    if (isFirstStep && currentIdx === startIdx) {
      targetCapacity = Math.min(lastAllocatedEmailRemainder, maxCapacity);
      isFirstStep = false; // first step handling complete
    }

    const available = targetCapacity - currentAllocatedCount;

    if (available > 0 && !isExhausted[currentIdx]) {
      const toAllocate = Math.min(remainingProspects, available);
      
      const prospectStart = prospects.length - remainingProspects;
      const allocatedSlice = prospects.slice(prospectStart, prospectStart + toAllocate);
      allocationsMap[acc.id].push(...allocatedSlice);
      
      remainingProspects -= toAllocate;
      lastUsedIdx = currentIdx;
      
      const newAllocatedCount = allocationsMap[acc.id].length;
      if (newAllocatedCount >= targetCapacity) {
        isExhausted[currentIdx] = true;
        exhaustedCount++;
      }
    } else {
      isExhausted[currentIdx] = true;
      exhaustedCount++;
    }

    if (remainingProspects > 0 && exhaustedCount < N) {
      currentIdx = (currentIdx + 1) % N;
    }
  }

  // Calculate final allocations array format
  const allocations = sortedAccounts
    .map(acc => ({
      account_id: acc.id,
      allocated_emails: allocationsMap[acc.id].length,
      allocated_list: allocationsMap[acc.id]
    }))
    .filter(a => a.allocated_emails > 0);

  // Determine the new last_allocated_email and its remainder
  const finalLastAcc = sortedAccounts[lastUsedIdx];
  const finalLastCapacity = capacities[lastUsedIdx];
  const finalLastAllocatedCount = allocationsMap[finalLastAcc.id].length;
  
  // Calculate remainder capacity of that account
  let targetCapacity = finalLastCapacity;
  if (lastUsedIdx === startIdx && lastAllocatedEmailRemainder > 0) {
    targetCapacity = Math.min(lastAllocatedEmailRemainder, finalLastCapacity);
  }
  
  lastUsedRemainder = targetCapacity - finalLastAllocatedCount;

  return {
    allocations,
    last_allocated_email: finalLastAcc.email,
    last_allocated_email_remainder: lastUsedRemainder
  };
}
