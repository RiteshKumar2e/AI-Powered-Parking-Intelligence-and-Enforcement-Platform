import { motion } from 'framer-motion'

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}
    >
      {children}
    </motion.div>
  )
}
