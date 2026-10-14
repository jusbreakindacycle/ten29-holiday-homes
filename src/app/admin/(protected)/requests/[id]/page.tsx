import {BookingOperations} from "@/components/features/admin/BookingOperations";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <BookingOperations view="detail" id={id}/>;}
