import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react'
import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from '@hugeicons/react'
import Activity01IconSvg from '@hugeicons/core-free-icons/Activity01Icon'
import Add01IconSvg from '@hugeicons/core-free-icons/Add01Icon'
import Alert01IconSvg from '@hugeicons/core-free-icons/Alert01Icon'
import AlertCircleIconSvg from '@hugeicons/core-free-icons/AlertCircleIcon'
import AnalyticsDownIconSvg from '@hugeicons/core-free-icons/AnalyticsDownIcon'
import AnalyticsUpIconSvg from '@hugeicons/core-free-icons/AnalyticsUpIcon'
import ArchiveArrowUpIconSvg from '@hugeicons/core-free-icons/ArchiveArrowUpIcon'
import ArchiveIconSvg from '@hugeicons/core-free-icons/ArchiveIcon'
import ArrowDown01IconSvg from '@hugeicons/core-free-icons/ArrowDown01Icon'
import ArrowDownLeft01IconSvg from '@hugeicons/core-free-icons/ArrowDownLeft01Icon'
import ArrowDownToLineIconSvg from '@hugeicons/core-free-icons/ArrowDownToLineIcon'
import ArrowLeft01IconSvg from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowLeftDoubleIconSvg from '@hugeicons/core-free-icons/ArrowLeftDoubleIcon'
import ArrowLeftRightIconSvg from '@hugeicons/core-free-icons/ArrowLeftRightIcon'
import ArrowRight01IconSvg from '@hugeicons/core-free-icons/ArrowRight01Icon'
import ArrowRightDoubleIconSvg from '@hugeicons/core-free-icons/ArrowRightDoubleIcon'
import ArrowTurnBackwardIconSvg from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon'
import ArrowTurnForwardIconSvg from '@hugeicons/core-free-icons/ArrowTurnForwardIcon'
import ArrowTurnUpIconSvg from '@hugeicons/core-free-icons/ArrowTurnUpIcon'
import ArrowUp01IconSvg from '@hugeicons/core-free-icons/ArrowUp01Icon'
import ArrowUpDownIconSvg from '@hugeicons/core-free-icons/ArrowUpDownIcon'
import ArrowUpFromLineIconSvg from '@hugeicons/core-free-icons/ArrowUpFromLineIcon'
import ArrowUpRight01IconSvg from '@hugeicons/core-free-icons/ArrowUpRight01Icon'
import Attachment01IconSvg from '@hugeicons/core-free-icons/Attachment01Icon'
import Award01IconSvg from '@hugeicons/core-free-icons/Award01Icon'
import BookBookmark01IconSvg from '@hugeicons/core-free-icons/BookBookmark01Icon'
import BookOpen01IconSvg from '@hugeicons/core-free-icons/BookOpen01Icon'
import Briefcase02IconSvg from '@hugeicons/core-free-icons/Briefcase02Icon'
import BubbleChatIconSvg from '@hugeicons/core-free-icons/BubbleChatIcon'
import Building02IconSvg from '@hugeicons/core-free-icons/Building02Icon'
import Building03IconSvg from '@hugeicons/core-free-icons/Building03Icon'
import Calendar01IconSvg from '@hugeicons/core-free-icons/Calendar01Icon'
import Calendar02IconSvg from '@hugeicons/core-free-icons/Calendar02Icon'
import CalendarCheckIn01IconSvg from '@hugeicons/core-free-icons/CalendarCheckIn01Icon'
import Camera01IconSvg from '@hugeicons/core-free-icons/Camera01Icon'
import Cancel01IconSvg from '@hugeicons/core-free-icons/Cancel01Icon'
import CancelCircleIconSvg from '@hugeicons/core-free-icons/CancelCircleIcon'
import ChampionIconSvg from '@hugeicons/core-free-icons/ChampionIcon'
import ChartBarLineIconSvg from '@hugeicons/core-free-icons/ChartBarLineIcon'
import ChartColumnIconSvg from '@hugeicons/core-free-icons/ChartColumnIcon'
import CheckIconSvg from '@hugeicons/core-free-icons/CheckIcon'
import CheckListIconSvg from '@hugeicons/core-free-icons/CheckListIcon'
import CheckmarkBadge01IconSvg from '@hugeicons/core-free-icons/CheckmarkBadge01Icon'
import CheckmarkCircle01IconSvg from '@hugeicons/core-free-icons/CheckmarkCircle01Icon'
import CheckmarkCircle02IconSvg from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import ChevronDownIconSvg from '@hugeicons/core-free-icons/ChevronDownIcon'
import ChevronRightIconSvg from '@hugeicons/core-free-icons/ChevronRightIcon'
import ChevronUpIconSvg from '@hugeicons/core-free-icons/ChevronUpIcon'
import CircleCheckIconSvg from '@hugeicons/core-free-icons/CircleCheckIcon'
import CircleDollarSignIconSvg from '@hugeicons/core-free-icons/CircleDollarSignIcon'
import CircleIconSvg from '@hugeicons/core-free-icons/CircleIcon'
import CircleOffIconSvg from '@hugeicons/core-free-icons/CircleOffIcon'
import ClipboardIconSvg from '@hugeicons/core-free-icons/ClipboardIcon'
import ClipboardPenLineIconSvg from '@hugeicons/core-free-icons/ClipboardPenLineIcon'
import Clock01IconSvg from '@hugeicons/core-free-icons/Clock01Icon'
import Clock03IconSvg from '@hugeicons/core-free-icons/Clock03Icon'
import CloudUploadIconSvg from '@hugeicons/core-free-icons/CloudUploadIcon'
import Coffee01IconSvg from '@hugeicons/core-free-icons/Coffee01Icon'
import Coins01IconSvg from '@hugeicons/core-free-icons/Coins01Icon'
import Copy01IconSvg from '@hugeicons/core-free-icons/Copy01Icon'
import CreditCardIconSvg from '@hugeicons/core-free-icons/CreditCardIcon'
import CrownIconSvg from '@hugeicons/core-free-icons/CrownIcon'
import DashboardSquare01IconSvg from '@hugeicons/core-free-icons/DashboardSquare01Icon'
import DatabaseIconSvg from '@hugeicons/core-free-icons/DatabaseIcon'
import DatabaseLightningIconSvg from '@hugeicons/core-free-icons/DatabaseLightningIcon'
import Delete02IconSvg from '@hugeicons/core-free-icons/Delete02Icon'
import Door01IconSvg from '@hugeicons/core-free-icons/Door01Icon'
import DoorIconSvg from '@hugeicons/core-free-icons/DoorIcon'
import Download01IconSvg from '@hugeicons/core-free-icons/Download01Icon'
import Drag01IconSvg from '@hugeicons/core-free-icons/Drag01Icon'
import EraserIconSvg from '@hugeicons/core-free-icons/EraserIcon'
import FaceIdIconSvg from '@hugeicons/core-free-icons/FaceIdIcon'
import FavouriteIconSvg from '@hugeicons/core-free-icons/FavouriteIcon'
import File02IconSvg from '@hugeicons/core-free-icons/File02Icon'
import FileBracesIconSvg from '@hugeicons/core-free-icons/FileBracesIcon'
import FileChartColumnIconSvg from '@hugeicons/core-free-icons/FileChartColumnIcon'
import FilePenIconSvg from '@hugeicons/core-free-icons/FilePenIcon'
import FilePlusIconSvg from '@hugeicons/core-free-icons/FilePlusIcon'
import FileSpreadsheetIconSvg from '@hugeicons/core-free-icons/FileSpreadsheetIcon'
import FileVideoIconSvg from '@hugeicons/core-free-icons/FileVideoIcon'
import FilterIconSvg from '@hugeicons/core-free-icons/FilterIcon'
import FloppyDiskIconSvg from '@hugeicons/core-free-icons/FloppyDiskIcon'
import GiftIconSvg from '@hugeicons/core-free-icons/GiftIcon'
import GlobeIconSvg from '@hugeicons/core-free-icons/GlobeIcon'
import HappyIconSvg from '@hugeicons/core-free-icons/HappyIcon'
import HierarchyFilesIconSvg from '@hugeicons/core-free-icons/HierarchyFilesIcon'
import Image01IconSvg from '@hugeicons/core-free-icons/Image01Icon'
import InboxIconSvg from '@hugeicons/core-free-icons/InboxIcon'
import InformationCircleIconSvg from '@hugeicons/core-free-icons/InformationCircleIcon'
import InternetAntenna01IconSvg from '@hugeicons/core-free-icons/InternetAntenna01Icon'
import Invoice01IconSvg from '@hugeicons/core-free-icons/Invoice01Icon'
import Invoice02IconSvg from '@hugeicons/core-free-icons/Invoice02Icon'
import Key02IconSvg from '@hugeicons/core-free-icons/Key02Icon'
import Layers01IconSvg from '@hugeicons/core-free-icons/Layers01Icon'
import Layers02IconSvg from '@hugeicons/core-free-icons/Layers02Icon'
import LayoutGridIconSvg from '@hugeicons/core-free-icons/LayoutGridIcon'
import LayoutThreeColumnIconSvg from '@hugeicons/core-free-icons/LayoutThreeColumnIcon'
import Link02IconSvg from '@hugeicons/core-free-icons/Link02Icon'
import Loading03IconSvg from '@hugeicons/core-free-icons/Loading03Icon'
import Location01IconSvg from '@hugeicons/core-free-icons/Location01Icon'
import LockIconSvg from '@hugeicons/core-free-icons/LockIcon'
import LockKeyIconSvg from '@hugeicons/core-free-icons/LockKeyIcon'
import Login01IconSvg from '@hugeicons/core-free-icons/Login01Icon'
import Logout01IconSvg from '@hugeicons/core-free-icons/Logout01Icon'
import Mail01IconSvg from '@hugeicons/core-free-icons/Mail01Icon'
import MailSend01IconSvg from '@hugeicons/core-free-icons/MailSend01Icon'
import Megaphone01IconSvg from '@hugeicons/core-free-icons/Megaphone01Icon'
import Menu01IconSvg from '@hugeicons/core-free-icons/Menu01Icon'
import Message01IconSvg from '@hugeicons/core-free-icons/Message01Icon'
import Mic01IconSvg from '@hugeicons/core-free-icons/Mic01Icon'
import MinusSignIconSvg from '@hugeicons/core-free-icons/MinusSignIcon'
import Money01IconSvg from '@hugeicons/core-free-icons/Money01Icon'
import Moon02IconSvg from '@hugeicons/core-free-icons/Moon02Icon'
import MoreHorizontalIconSvg from '@hugeicons/core-free-icons/MoreHorizontalIcon'
import MoreVerticalIconSvg from '@hugeicons/core-free-icons/MoreVerticalIcon'
import Mortarboard01IconSvg from '@hugeicons/core-free-icons/Mortarboard01Icon'
import NotebookIconSvg from '@hugeicons/core-free-icons/NotebookIcon'
import Notification01IconSvg from '@hugeicons/core-free-icons/Notification01Icon'
import NotificationBubbleIconSvg from '@hugeicons/core-free-icons/NotificationBubbleIcon'
import NotificationOff01IconSvg from '@hugeicons/core-free-icons/NotificationOff01Icon'
import OctagonXIconSvg from '@hugeicons/core-free-icons/OctagonXIcon'
import PackageIconSvg from '@hugeicons/core-free-icons/PackageIcon'
import PauseIconSvg from '@hugeicons/core-free-icons/PauseIcon'
import PencilEdit02IconSvg from '@hugeicons/core-free-icons/PencilEdit02Icon'
import PinIconSvg from '@hugeicons/core-free-icons/PinIcon'
import PinOffIconSvg from '@hugeicons/core-free-icons/PinOffIcon'
import PlayIconSvg from '@hugeicons/core-free-icons/PlayIcon'
import Plug01IconSvg from '@hugeicons/core-free-icons/Plug01Icon'
import RefreshIconSvg from '@hugeicons/core-free-icons/RefreshIcon'
import RepeatIconSvg from '@hugeicons/core-free-icons/RepeatIcon'
import RotateLeft01IconSvg from '@hugeicons/core-free-icons/RotateLeft01Icon'
import RssIconSvg from '@hugeicons/core-free-icons/RssIcon'
import ScrollIconSvg from '@hugeicons/core-free-icons/ScrollIcon'
import Search01IconSvg from '@hugeicons/core-free-icons/Search01Icon'
import SecurityCheckIconSvg from '@hugeicons/core-free-icons/SecurityCheckIcon'
import SentIconSvg from '@hugeicons/core-free-icons/SentIcon'
import ServerStack01IconSvg from '@hugeicons/core-free-icons/ServerStack01Icon'
import Settings01IconSvg from '@hugeicons/core-free-icons/Settings01Icon'
import Settings02IconSvg from '@hugeicons/core-free-icons/Settings02Icon'
import Shield01IconSvg from '@hugeicons/core-free-icons/Shield01Icon'
import ShoppingCart01IconSvg from '@hugeicons/core-free-icons/ShoppingCart01Icon'
import SlidersHorizontalIconSvg from '@hugeicons/core-free-icons/SlidersHorizontalIcon'
import SmartPhone01IconSvg from '@hugeicons/core-free-icons/SmartPhone01Icon'
import SmileIconSvg from '@hugeicons/core-free-icons/SmileIcon'
import SparklesIconSvg from '@hugeicons/core-free-icons/SparklesIcon'
import SpoonAndForkIconSvg from '@hugeicons/core-free-icons/SpoonAndForkIcon'
import StarIconSvg from '@hugeicons/core-free-icons/StarIcon'
import Sun01IconSvg from '@hugeicons/core-free-icons/Sun01Icon'
import Table01IconSvg from '@hugeicons/core-free-icons/Table01Icon'
import Tick01IconSvg from '@hugeicons/core-free-icons/Tick01Icon'
import TickDouble01IconSvg from '@hugeicons/core-free-icons/TickDouble01Icon'
import TimeScheduleIconSvg from '@hugeicons/core-free-icons/TimeScheduleIcon'
import Unlink02IconSvg from '@hugeicons/core-free-icons/Unlink02Icon'
import Upload01IconSvg from '@hugeicons/core-free-icons/Upload01Icon'
import UserAdd01IconSvg from '@hugeicons/core-free-icons/UserAdd01Icon'
import UserCheck01IconSvg from '@hugeicons/core-free-icons/UserCheck01Icon'
import UserCircleIconSvg from '@hugeicons/core-free-icons/UserCircleIcon'
import UserIconSvg from '@hugeicons/core-free-icons/UserIcon'
import UserMinus01IconSvg from '@hugeicons/core-free-icons/UserMinus01Icon'
import UserMultipleIconSvg from '@hugeicons/core-free-icons/UserMultipleIcon'
import UserRemove01IconSvg from '@hugeicons/core-free-icons/UserRemove01Icon'
import UserSettings01IconSvg from '@hugeicons/core-free-icons/UserSettings01Icon'
import UserSquareIconSvg from '@hugeicons/core-free-icons/UserSquareIcon'
import ViewIconSvg from '@hugeicons/core-free-icons/ViewIcon'
import ViewOffIconSvg from '@hugeicons/core-free-icons/ViewOffIcon'
import Wallet01IconSvg from '@hugeicons/core-free-icons/Wallet01Icon'
import Wallet03IconSvg from '@hugeicons/core-free-icons/Wallet03Icon'
import WebhookIconSvg from '@hugeicons/core-free-icons/WebhookIcon'
import WorkHistoryIconSvg from '@hugeicons/core-free-icons/WorkHistoryIcon'
import WorkflowCircle01IconSvg from '@hugeicons/core-free-icons/WorkflowCircle01Icon'

export type IconProps = Omit<HugeiconsIconProps, 'icon' | 'altIcon'>
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>
export type LucideIcon = IconComponent

function createHugeIcon(icon: IconSvgElement, displayName: string): IconComponent {
  const Component = forwardRef<SVGSVGElement, IconProps>(function HugeIcon(
    { size = 24, color = 'currentColor', strokeWidth = 1.5, ...props },
    ref,
  ) {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        {...props}
      />
    )
  })

  Component.displayName = displayName
  return Component
}

export const Activity = createHugeIcon(Activity01IconSvg, 'Activity')
export const AlertCircle = createHugeIcon(AlertCircleIconSvg, 'AlertCircle')
export const AlertTriangle = createHugeIcon(Alert01IconSvg, 'AlertTriangle')
export const Archive = createHugeIcon(ArchiveIconSvg, 'Archive')
export const ArchiveRestore = createHugeIcon(ArchiveArrowUpIconSvg, 'ArchiveRestore')
export const ArrowDown = createHugeIcon(ArrowDown01IconSvg, 'ArrowDown')
export const ArrowDownLeft = createHugeIcon(ArrowDownLeft01IconSvg, 'ArrowDownLeft')
export const ArrowDownToLine = createHugeIcon(ArrowDownToLineIconSvg, 'ArrowDownToLine')
export const ArrowLeft = createHugeIcon(ArrowLeft01IconSvg, 'ArrowLeft')
export const ArrowLeftRight = createHugeIcon(ArrowLeftRightIconSvg, 'ArrowLeftRight')
export const ArrowRight = createHugeIcon(ArrowRight01IconSvg, 'ArrowRight')
export const ArrowRightLeft = createHugeIcon(ArrowLeftRightIconSvg, 'ArrowRightLeft')
export const ArrowUp = createHugeIcon(ArrowUp01IconSvg, 'ArrowUp')
export const ArrowUpFromLine = createHugeIcon(ArrowUpFromLineIconSvg, 'ArrowUpFromLine')
export const ArrowUpRight = createHugeIcon(ArrowUpRight01IconSvg, 'ArrowUpRight')
export const Award = createHugeIcon(Award01IconSvg, 'Award')
export const BadgeCheck = createHugeIcon(CheckmarkBadge01IconSvg, 'BadgeCheck')
export const Banknote = createHugeIcon(Money01IconSvg, 'Banknote')
export const BarChart2 = createHugeIcon(ChartBarLineIconSvg, 'BarChart2')
export const BarChart3 = createHugeIcon(ChartColumnIconSvg, 'BarChart3')
export const Bell = createHugeIcon(Notification01IconSvg, 'Bell')
export const BellOff = createHugeIcon(NotificationOff01IconSvg, 'BellOff')
export const BellRing = createHugeIcon(NotificationBubbleIconSvg, 'BellRing')
export const BookCheck = createHugeIcon(BookBookmark01IconSvg, 'BookCheck')
export const BookOpen = createHugeIcon(BookOpen01IconSvg, 'BookOpen')
export const BriefcaseBusiness = createHugeIcon(Briefcase02IconSvg, 'BriefcaseBusiness')
export const Building2 = createHugeIcon(Building02IconSvg, 'Building2')
export const Calendar = createHugeIcon(Calendar01IconSvg, 'Calendar')
export const CalendarCheck = createHugeIcon(CalendarCheckIn01IconSvg, 'CalendarCheck')
export const CalendarClock = createHugeIcon(TimeScheduleIconSvg, 'CalendarClock')
export const CalendarDays = createHugeIcon(Calendar02IconSvg, 'CalendarDays')
export const Camera = createHugeIcon(Camera01IconSvg, 'Camera')
export const Check = createHugeIcon(Tick01IconSvg, 'Check')
export const CheckCheck = createHugeIcon(TickDouble01IconSvg, 'CheckCheck')
export const CheckCircle2 = createHugeIcon(CheckmarkCircle02IconSvg, 'CheckCircle2')
export const CheckIcon = createHugeIcon(CheckIconSvg, 'CheckIcon')
export const ChevronDown = createHugeIcon(ArrowDown01IconSvg, 'ChevronDown')
export const ChevronDownIcon = createHugeIcon(ChevronDownIconSvg, 'ChevronDownIcon')
export const ChevronLeft = createHugeIcon(ArrowLeft01IconSvg, 'ChevronLeft')
export const ChevronRight = createHugeIcon(ArrowRight01IconSvg, 'ChevronRight')
export const ChevronRightIcon = createHugeIcon(ChevronRightIconSvg, 'ChevronRightIcon')
export const ChevronUp = createHugeIcon(ArrowUp01IconSvg, 'ChevronUp')
export const ChevronUpIcon = createHugeIcon(ChevronUpIconSvg, 'ChevronUpIcon')
export const ChevronsLeft = createHugeIcon(ArrowLeftDoubleIconSvg, 'ChevronsLeft')
export const ChevronsRight = createHugeIcon(ArrowRightDoubleIconSvg, 'ChevronsRight')
export const ChevronsUpDown = createHugeIcon(ArrowUpDownIconSvg, 'ChevronsUpDown')
export const CircleAlert = createHugeIcon(AlertCircleIconSvg, 'CircleAlert')
export const CircleCheck = createHugeIcon(CheckmarkCircle01IconSvg, 'CircleCheck')
export const CircleCheckIcon = createHugeIcon(CircleCheckIconSvg, 'CircleCheckIcon')
export const CircleDollarSign = createHugeIcon(CircleDollarSignIconSvg, 'CircleDollarSign')
export const CircleIcon = createHugeIcon(CircleIconSvg, 'CircleIcon')
export const CircleOff = createHugeIcon(CircleOffIconSvg, 'CircleOff')
export const ClipboardCheck = createHugeIcon(ClipboardIconSvg, 'ClipboardCheck')
export const ClipboardEdit = createHugeIcon(ClipboardPenLineIconSvg, 'ClipboardEdit')
export const ClipboardList = createHugeIcon(CheckListIconSvg, 'ClipboardList')
export const Clock = createHugeIcon(Clock01IconSvg, 'Clock')
export const Clock3 = createHugeIcon(Clock03IconSvg, 'Clock3')
export const Coffee = createHugeIcon(Coffee01IconSvg, 'Coffee')
export const Cog = createHugeIcon(Settings01IconSvg, 'Cog')
export const Columns3 = createHugeIcon(LayoutThreeColumnIconSvg, 'Columns3')
export const Copy = createHugeIcon(Copy01IconSvg, 'Copy')
export const CornerUpLeft = createHugeIcon(ArrowTurnUpIconSvg, 'CornerUpLeft')
export const CreditCard = createHugeIcon(CreditCardIconSvg, 'CreditCard')
export const Crown = createHugeIcon(CrownIconSvg, 'Crown')
export const Database = createHugeIcon(DatabaseIconSvg, 'Database')
export const DatabaseZap = createHugeIcon(DatabaseLightningIconSvg, 'DatabaseZap')
export const DoorClosed = createHugeIcon(DoorIconSvg, 'DoorClosed')
export const DoorOpen = createHugeIcon(Door01IconSvg, 'DoorOpen')
export const Download = createHugeIcon(Download01IconSvg, 'Download')
export const Edit3 = createHugeIcon(PencilEdit02IconSvg, 'Edit3')
export const Eraser = createHugeIcon(EraserIconSvg, 'Eraser')
export const ExternalLink = createHugeIcon(ArrowUpRight01IconSvg, 'ExternalLink')
export const Eye = createHugeIcon(ViewIconSvg, 'Eye')
export const EyeOff = createHugeIcon(ViewOffIconSvg, 'EyeOff')
export const FileBarChart = createHugeIcon(FileChartColumnIconSvg, 'FileBarChart')
export const FileJson = createHugeIcon(FileBracesIconSvg, 'FileJson')
export const FilePlus2 = createHugeIcon(FilePlusIconSvg, 'FilePlus2')
export const FileSignature = createHugeIcon(FilePenIconSvg, 'FileSignature')
export const FileSpreadsheet = createHugeIcon(FileSpreadsheetIconSvg, 'FileSpreadsheet')
export const FileText = createHugeIcon(File02IconSvg, 'FileText')
export const FileVideo = createHugeIcon(FileVideoIconSvg, 'FileVideo')
export const Filter = createHugeIcon(FilterIconSvg, 'Filter')
export const Forward = createHugeIcon(ArrowTurnForwardIconSvg, 'Forward')
export const Gift = createHugeIcon(GiftIconSvg, 'Gift')
export const Globe = createHugeIcon(GlobeIconSvg, 'Globe')
export const GraduationCap = createHugeIcon(Mortarboard01IconSvg, 'GraduationCap')
export const GripVertical = createHugeIcon(Drag01IconSvg, 'GripVertical')
export const HandCoins = createHugeIcon(Coins01IconSvg, 'HandCoins')
export const Heart = createHugeIcon(FavouriteIconSvg, 'Heart')
export const History = createHugeIcon(WorkHistoryIconSvg, 'History')
export const ImageIcon = createHugeIcon(Image01IconSvg, 'ImageIcon')
export const Inbox = createHugeIcon(InboxIconSvg, 'Inbox')
export const Info = createHugeIcon(InformationCircleIconSvg, 'Info')
export const InfoIcon = createHugeIcon(InformationCircleIconSvg, 'InfoIcon')
export const KeyRound = createHugeIcon(Key02IconSvg, 'KeyRound')
export const Landmark = createHugeIcon(Building03IconSvg, 'Landmark')
export const Layers = createHugeIcon(Layers01IconSvg, 'Layers')
export const Layers3 = createHugeIcon(Layers02IconSvg, 'Layers3')
export const LayoutDashboard = createHugeIcon(DashboardSquare01IconSvg, 'LayoutDashboard')
export const LayoutGrid = createHugeIcon(LayoutGridIconSvg, 'LayoutGrid')
export const Link2 = createHugeIcon(Link02IconSvg, 'Link2')
export const ListChecks = createHugeIcon(CheckListIconSvg, 'ListChecks')
export const ListTodo = createHugeIcon(CheckListIconSvg, 'ListTodo')
export const ListTree = createHugeIcon(HierarchyFilesIconSvg, 'ListTree')
export const Loader2 = createHugeIcon(Loading03IconSvg, 'Loader2')
export const Loader2Icon = createHugeIcon(Loading03IconSvg, 'Loader2Icon')
export const Lock = createHugeIcon(LockIconSvg, 'Lock')
export const LockKeyhole = createHugeIcon(LockKeyIconSvg, 'LockKeyhole')
export const LogIn = createHugeIcon(Login01IconSvg, 'LogIn')
export const LogOut = createHugeIcon(Logout01IconSvg, 'LogOut')
export const Mail = createHugeIcon(Mail01IconSvg, 'Mail')
export const MapPin = createHugeIcon(Location01IconSvg, 'MapPin')
export const Megaphone = createHugeIcon(Megaphone01IconSvg, 'Megaphone')
export const Menu = createHugeIcon(Menu01IconSvg, 'Menu')
export const MessageCircle = createHugeIcon(BubbleChatIconSvg, 'MessageCircle')
export const MessageSquare = createHugeIcon(Message01IconSvg, 'MessageSquare')
export const Mic = createHugeIcon(Mic01IconSvg, 'Mic')
export const Minus = createHugeIcon(MinusSignIconSvg, 'Minus')
export const Moon = createHugeIcon(Moon02IconSvg, 'Moon')
export const MoreHorizontal = createHugeIcon(MoreHorizontalIconSvg, 'MoreHorizontal')
export const MoreVertical = createHugeIcon(MoreVerticalIconSvg, 'MoreVertical')
export const Notebook = createHugeIcon(NotebookIconSvg, 'Notebook')
export const OctagonXIcon = createHugeIcon(OctagonXIconSvg, 'OctagonXIcon')
export const Package = createHugeIcon(PackageIconSvg, 'Package')
export const Paperclip = createHugeIcon(Attachment01IconSvg, 'Paperclip')
export const Pause = createHugeIcon(PauseIconSvg, 'Pause')
export const Pencil = createHugeIcon(PencilEdit02IconSvg, 'Pencil')
export const Phone = createHugeIcon(SmartPhone01IconSvg, 'Phone')
export const Pin = createHugeIcon(PinIconSvg, 'Pin')
export const PinOff = createHugeIcon(PinOffIconSvg, 'PinOff')
export const Play = createHugeIcon(PlayIconSvg, 'Play')
export const Plug = createHugeIcon(Plug01IconSvg, 'Plug')
export const Plus = createHugeIcon(Add01IconSvg, 'Plus')
export const RadioTower = createHugeIcon(InternetAntenna01IconSvg, 'RadioTower')
export const Receipt = createHugeIcon(Invoice01IconSvg, 'Receipt')
export const ReceiptText = createHugeIcon(Invoice02IconSvg, 'ReceiptText')
export const RefreshCcw = createHugeIcon(RefreshIconSvg, 'RefreshCcw')
export const RefreshCw = createHugeIcon(RefreshIconSvg, 'RefreshCw')
export const Repeat = createHugeIcon(RepeatIconSvg, 'Repeat')
export const Reply = createHugeIcon(ArrowTurnBackwardIconSvg, 'Reply')
export const RotateCcw = createHugeIcon(RotateLeft01IconSvg, 'RotateCcw')
export const Rss = createHugeIcon(RssIconSvg, 'Rss')
export const Save = createHugeIcon(FloppyDiskIconSvg, 'Save')
export const ScanFace = createHugeIcon(FaceIdIconSvg, 'ScanFace')
export const ScrollText = createHugeIcon(ScrollIconSvg, 'ScrollText')
export const Search = createHugeIcon(Search01IconSvg, 'Search')
export const SearchIcon = createHugeIcon(Search01IconSvg, 'SearchIcon')
export const Send = createHugeIcon(MailSend01IconSvg, 'Send')
export const SendHorizonal = createHugeIcon(SentIconSvg, 'SendHorizonal')
export const Server = createHugeIcon(ServerStack01IconSvg, 'Server')
export const ServerCog = createHugeIcon(ServerStack01IconSvg, 'ServerCog')
export const Settings = createHugeIcon(Settings01IconSvg, 'Settings')
export const Settings2 = createHugeIcon(Settings02IconSvg, 'Settings2')
export const Shield = createHugeIcon(Shield01IconSvg, 'Shield')
export const ShieldAlert = createHugeIcon(Shield01IconSvg, 'ShieldAlert')
export const ShieldCheck = createHugeIcon(SecurityCheckIconSvg, 'ShieldCheck')
export const ShoppingCart = createHugeIcon(ShoppingCart01IconSvg, 'ShoppingCart')
export const SlidersHorizontal = createHugeIcon(SlidersHorizontalIconSvg, 'SlidersHorizontal')
export const Smartphone = createHugeIcon(SmartPhone01IconSvg, 'Smartphone')
export const Smile = createHugeIcon(SmileIconSvg, 'Smile')
export const SmilePlus = createHugeIcon(HappyIconSvg, 'SmilePlus')
export const Sparkles = createHugeIcon(SparklesIconSvg, 'Sparkles')
export const SquarePen = createHugeIcon(PencilEdit02IconSvg, 'SquarePen')
export const Star = createHugeIcon(StarIconSvg, 'Star')
export const Sun = createHugeIcon(Sun01IconSvg, 'Sun')
export const Table2 = createHugeIcon(Table01IconSvg, 'Table2')
export const Trash2 = createHugeIcon(Delete02IconSvg, 'Trash2')
export const TrendingDown = createHugeIcon(AnalyticsDownIconSvg, 'TrendingDown')
export const TrendingUp = createHugeIcon(AnalyticsUpIconSvg, 'TrendingUp')
export const TriangleAlert = createHugeIcon(Alert01IconSvg, 'TriangleAlert')
export const TriangleAlertIcon = createHugeIcon(Alert01IconSvg, 'TriangleAlertIcon')
export const Trophy = createHugeIcon(ChampionIconSvg, 'Trophy')
export const Unlink2 = createHugeIcon(Unlink02IconSvg, 'Unlink2')
export const Upload = createHugeIcon(Upload01IconSvg, 'Upload')
export const UploadCloud = createHugeIcon(CloudUploadIconSvg, 'UploadCloud')
export const User = createHugeIcon(UserIconSvg, 'User')
export const UserCheck = createHugeIcon(UserCheck01IconSvg, 'UserCheck')
export const UserCog = createHugeIcon(UserSettings01IconSvg, 'UserCog')
export const UserMinus = createHugeIcon(UserMinus01IconSvg, 'UserMinus')
export const UserPlus = createHugeIcon(UserAdd01IconSvg, 'UserPlus')
export const UserRound = createHugeIcon(UserCircleIconSvg, 'UserRound')
export const UserRoundCheck = createHugeIcon(UserCheck01IconSvg, 'UserRoundCheck')
export const UserRoundX = createHugeIcon(UserRemove01IconSvg, 'UserRoundX')
export const UserSquare = createHugeIcon(UserSquareIconSvg, 'UserSquare')
export const Users = createHugeIcon(UserMultipleIconSvg, 'Users')
export const UtensilsCrossed = createHugeIcon(SpoonAndForkIconSvg, 'UtensilsCrossed')
export const Vote = createHugeIcon(CheckListIconSvg, 'Vote')
export const Wallet = createHugeIcon(Wallet01IconSvg, 'Wallet')
export const WalletCards = createHugeIcon(Wallet03IconSvg, 'WalletCards')
export const Webhook = createHugeIcon(WebhookIconSvg, 'Webhook')
export const Workflow = createHugeIcon(WorkflowCircle01IconSvg, 'Workflow')
export const X = createHugeIcon(Cancel01IconSvg, 'X')
export const XCircle = createHugeIcon(CancelCircleIconSvg, 'XCircle')
export const XIcon = createHugeIcon(Cancel01IconSvg, 'XIcon')

// ─── Telegram-style filled icons (chat module) ──────────────────────────────
// Hand-drawn recreations of Telegram's filled/rounded icon shapes for the
// Telegram-look chat page (generic silhouettes, not copied assets). They
// satisfy IconComponent so they slot anywhere a HugeIcon does; stroke props
// are accepted and ignored — these are solid fills by design.
function createTgIcon(paths: string[], displayName: string): IconComponent {
  const Component = forwardRef<SVGSVGElement, IconProps>(function TgIcon(
    { size = 24, color = 'currentColor', strokeWidth: _strokeWidth, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={typeof color === 'string' ? color : 'currentColor'}
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} fillRule="evenodd" clipRule="evenodd" />
        ))}
      </svg>
    )
  })
  Component.displayName = displayName
  return Component
}

/** Filled chat bubble with three dots — Telegram "All chats" folder. */
export const TgAllChats = createTgIcon(
  [
    'M12 2.5c-5.4 0-9.5 3.8-9.5 8.6 0 2.6 1.2 4.9 3.2 6.4l-.7 3.2c-.1.6.5 1.1 1.1.8l3.5-1.7c.8.2 1.6.3 2.4.3 5.4 0 9.5-3.8 9.5-8.6S17.4 2.5 12 2.5zm-4.2 9.9a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4.2 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4.2 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z',
  ],
  'TgAllChats',
)

/** Filled person bust — Telegram "Personal" folder. */
export const TgPersonal = createTgIcon(
  [
    'M12 11.4a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M12 13.4c-4.3 0-7.5 2.2-7.5 5 0 1.2 1 2.2 2.2 2.2h10.6c1.2 0 2.2-1 2.2-2.2 0-2.8-3.2-5-7.5-5z',
  ],
  'TgPersonal',
)

/** Two filled busts — Telegram "Groups" folder. */
export const TgGroups = createTgIcon(
  [
    'M9 11.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4z',
    'M9 13.4c-3.9 0-6.8 2-6.8 4.6 0 1.1.9 2 2 2h9.6c1.1 0 2-.9 2-2 0-2.6-2.9-4.6-6.8-4.6z',
    'M16.4 11.6a3.2 3.2 0 1 0-1.9-5.8 5.2 5.2 0 0 1 0 5.2c.55.38 1.2.6 1.9.6z',
    'M17 13.5c-.4 0-.8 0-1.2.1 1.3 1 2 2.4 2 4 0 .9-.3 1.7-.8 2.4h2.8c1.1 0 2-.9 2-2 0-2.5-2.4-4.5-4.8-4.5z',
  ],
  'TgGroups',
)

/** Filled megaphone — Telegram "Channels" folder. */
export const TgChannel = createTgIcon(
  [
    'M19.1 3.4c.9-.5 2.1.2 2.1 1.3v14.6c0 1.1-1.2 1.8-2.1 1.3l-6.8-3.5H10v2.6c0 1.2-1 2.1-2.1 2.1-1 0-1.8-.6-2-1.5l-.9-3.4A3.9 3.9 0 0 1 2.2 13v-2c0-2.1 1.7-3.9 3.9-3.9h6.2l6.8-3.7z',
  ],
  'TgChannel',
)

/** Filled bubble with a punched badge dot — Telegram "Unread" folder. */
export const TgUnread = createTgIcon(
  [
    'M12 2.5c-5.4 0-9.5 3.8-9.5 8.6 0 2.6 1.2 4.9 3.2 6.4l-.7 3.2c-.1.6.5 1.1 1.1.8l3.5-1.7c.8.2 1.6.3 2.4.3 5.4 0 9.5-3.8 9.5-8.6 0-.6-.1-1.2-.2-1.8a5 5 0 0 1-6.9-6.5c-.8-.4-1.6-.7-2.4-.7zM18.5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ],
  'TgUnread',
)

/** Circle-in-circle — Telegram round video-message icon. */
export const TgRoundVideo = createTgIcon(
  [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 1.9a8.1 8.1 0 1 1 0 16.2 8.1 8.1 0 0 1 0-16.2z',
    'M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z',
  ],
  'TgRoundVideo',
)

/** Filled paper plane — Telegram send button. */
export const TgSendPlane = createTgIcon(
  [
    'M3.7 3.6c-.9-.4-1.9.5-1.5 1.4l2.4 6.2c.1.4.5.7.9.7l7.7.7c.3 0 .3.5 0 .5l-7.7.7c-.4 0-.8.3-.9.7l-2.4 6.2c-.4.9.6 1.8 1.5 1.4l17.2-8c.8-.4.8-1.5 0-1.9l-17.2-7z',
  ],
  'TgSendPlane',
)

/** Pencil over rounded square — Telegram compose (new chat). */
export const TgCompose = createTgIcon(
  [
    'M13.5 3a1 1 0 0 1 0 2H6.4c-.8 0-1.4.6-1.4 1.4v11.2c0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4v-7.1a1 1 0 0 1 2 0v7.1a3.4 3.4 0 0 1-3.4 3.4H6.4A3.4 3.4 0 0 1 3 17.6V6.4A3.4 3.4 0 0 1 6.4 3h7.1z',
    'M20.8 3.2a2.3 2.3 0 0 0-3.2 0l-7.1 7.1c-.2.2-.4.5-.4.8l-.6 2.8c-.1.6.4 1.1 1 1l2.8-.6c.3-.1.6-.2.8-.4l7.1-7.1c.9-.9.9-2.3 0-3.2l-.4-.4z',
  ],
  'TgCompose',
)
