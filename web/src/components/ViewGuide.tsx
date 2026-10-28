import React from 'react';
export function ViewGuide({ children }: { children: React.ReactNode }) {
 return <details className="view-guide"><summary>Thông tin hướng dẫn</summary><div>{children}</div></details>;
}
